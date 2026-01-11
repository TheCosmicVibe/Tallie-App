import { AppDataSource } from '../config/database';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { Waitlist } from '../models/Waitlist';
import {
  CreateReservationDto,
  UpdateReservationDto,
  ReservationStatus,
  WaitlistStatus,
} from '../types';
import { ApiError } from '../utils/ApiError';
import { TimeHelper } from '../utils/timeHelper';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { AvailabilityService } from './availabilityService';
import { SeatingOptimizationService } from './seatingOptimizationService';
import { NotificationService } from './notificationService';
import { v4 as uuidv4 } from 'uuid';

export class ReservationService {
  private readonly reservationRepository = AppDataSource.getRepository(Reservation);
  private readonly restaurantRepository = AppDataSource.getRepository(Restaurant);
  private readonly tableRepository = AppDataSource.getRepository(Table);
  private readonly waitlistRepository = AppDataSource.getRepository(Waitlist);
  private readonly availabilityService = new AvailabilityService();
  private readonly seatingService = new SeatingOptimizationService();
  private readonly notificationService = new NotificationService();

  async createReservation(
    restaurantId: number,
    data: CreateReservationDto
  ): Promise<Reservation> {
    const {
      customerName,
      customerPhone,
      customerEmail,
      partySize,
      reservationDate,
      reservationTime,
      duration,
      specialRequests,
    } = data;

    // Validate restaurant
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw ApiError.notFound('Restaurant not found');
    }

    // Validate date
    if (!TimeHelper.isValidDate(reservationDate)) {
      throw ApiError.badRequest('Invalid reservation date');
    }

    // Validate time
    if (!TimeHelper.isValidTime(reservationTime)) {
      throw ApiError.badRequest('Invalid reservation time');
    }

    // Check if date is in the future
    if (!TimeHelper.isFutureDateTime(reservationDate, reservationTime)) {
      throw ApiError.badRequest('Reservation must be in the future');
    }

    // Check advance booking period
    if (
      !TimeHelper.isWithinAdvanceBookingPeriod(
        reservationDate,
        env.MAX_ADVANCE_BOOKING_DAYS
      )
    ) {
      throw ApiError.badRequest(
        `Reservations can only be made up to ${env.MAX_ADVANCE_BOOKING_DAYS} days in advance`
      );
    }

    // Calculate duration
    let reservationDuration = duration || env.DEFAULT_RESERVATION_DURATION;

    // Check if it's peak hours and apply restrictions
    if (
      TimeHelper.isPeakHour(
        reservationTime,
        env.PEAK_HOURS_START,
        env.PEAK_HOURS_END
      )
    ) {
      if (reservationDuration > env.PEAK_HOURS_MAX_DURATION) {
        reservationDuration = env.PEAK_HOURS_MAX_DURATION;
        logger.info(
          `Duration adjusted to ${reservationDuration} minutes for peak hours`
        );
      }
    }

    const endTime = TimeHelper.addMinutesToTime(
      reservationTime,
      reservationDuration
    );

    // Check if within operating hours
    const startDateTime = TimeHelper.parseDateTime(
      reservationDate,
      reservationTime
    );
    const endDateTime = TimeHelper.parseDateTime(reservationDate, endTime);

    if (
      !TimeHelper.isWithinOperatingHours(
        startDateTime,
        restaurant.openingTime,
        restaurant.closingTime
      ) ||
      !TimeHelper.isWithinOperatingHours(
        endDateTime,
        restaurant.openingTime,
        restaurant.closingTime
      )
    ) {
      throw ApiError.badRequest(
        `Reservation must be within operating hours (${restaurant.openingTime} - ${restaurant.closingTime})`
      );
    }

    // Find optimal table
    const suggestedTables = await this.seatingService.suggestOptimalTable(
      restaurantId,
      partySize,
      reservationDate,
      reservationTime,
      reservationDuration
    );

    if (suggestedTables.length === 0) {
      // No tables available - add to waitlist
      return await this.handleNoAvailability(
        restaurantId,
        data,
        reservationDate,
        reservationTime
      );
    }

    const bestTable = suggestedTables[0];

    // Create reservation
    const confirmationCode = uuidv4().substring(0, 8).toUpperCase();

    const reservation = this.reservationRepository.create({
      restaurantId,
      tableId: bestTable.tableId,
      customerName,
      customerPhone,
      customerEmail,
      partySize,
      reservationDate,
      startTime: reservationTime,
      endTime,
      duration: reservationDuration,
      status: ReservationStatus.CONFIRMED,
      specialRequests,
      confirmationCode,
    });

    await this.reservationRepository.save(reservation);

    logger.info(
      `Reservation created: ${confirmationCode} for ${customerName} at table ${bestTable.tableNumber}`
    );

    // Invalidate cache
    await redisClient.delPattern(`availability:${restaurantId}:*`);
    await redisClient.delPattern(`reservations:${restaurantId}:*`);

    // Send confirmation
    const table = await this.tableRepository.findOne({
      where: { id: bestTable.tableId },
    });

    await this.notificationService.sendConfirmation('reservation', {
      customerName,
      customerPhone,
      customerEmail,
      details: {
        restaurantName: restaurant.name,
        reservationDate,
        reservationTime,
        partySize,
        tableNumber: table?.tableNumber,
        confirmationCode,
      },
    });

    return reservation;
  }

  private async handleNoAvailability(
    restaurantId: number,
    data: CreateReservationDto,
    date: string,
    time: string
  ): Promise<never> {
    // Check for alternative time slots
    const alternatives = await this.availabilityService.findAlternativeSlots(
      restaurantId,
      date,
      data.partySize,
      time,
      data.duration || env.DEFAULT_RESERVATION_DURATION
    );

    if (alternatives.length > 0) {
      throw ApiError.conflict(
        JSON.stringify({
          message: 'No tables available for the requested time',
          alternatives: alternatives.map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            availableTables: slot.availableTables.length,
          })),
        })
      );
    }

    // No alternatives - suggest waitlist
    throw ApiError.conflict(
      'No tables available. Would you like to join the waitlist?'
    );
  }

  async getReservationById(id: number): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['restaurant', 'table'],
    });

    if (!reservation) {
      throw ApiError.notFound('Reservation not found');
    }

    return reservation;
  }

  async getReservationsByRestaurant(
    restaurantId: number,
    date: string
  ): Promise<Reservation[]> {
    const cacheKey = `reservations:${restaurantId}:${date}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const reservations = await this.reservationRepository.find({
      where: {
        restaurantId,
        reservationDate: date,
      },
      relations: ['table'],
      order: {
        startTime: 'ASC',
      },
    });

    await redisClient.set(cacheKey, JSON.stringify(reservations), 1800);

    return reservations;
  }

  async updateReservation(
    id: number,
    data: UpdateReservationDto
  ): Promise<Reservation> {
    const reservation = await this.getReservationById(id);

    // Can't modify cancelled or completed reservations
    if ([ReservationStatus.CANCELLED, ReservationStatus.COMPLETED].includes(reservation.status)) {
      throw ApiError.badRequest(
        `Cannot modify ${reservation.status} reservation`
      );
    }

    const updateData: Partial<Reservation> = {};

    // Handle date/time changes
    if (data.reservationDate || data.reservationTime) {
      const newDate = data.reservationDate || reservation.reservationDate;
      const newTime = data.reservationTime || reservation.startTime;
      const newDuration = data.duration || reservation.duration;

      // Validate new time slot
      const newEndTime = TimeHelper.addMinutesToTime(newTime, newDuration);

      const isAvailable = await this.availabilityService.isTableAvailable(
        reservation.tableId,
        newDate,
        newTime,
        newEndTime,
        reservation.id
      );

      if (!isAvailable) {
        throw ApiError.conflict(
          'Table is not available for the requested time'
        );
      }

      updateData.reservationDate = newDate;
      updateData.startTime = newTime;
      updateData.endTime = newEndTime;
      updateData.duration = newDuration;
    }

    // Handle party size changes
    if (data.partySize) {
      const table = await this.tableRepository.findOne({
        where: { id: reservation.tableId },
      });

      if (table && data.partySize > table.capacity) {
        // Find better table
        const betterTables = await this.seatingService.suggestOptimalTable(
          reservation.restaurantId,
          data.partySize,
          updateData.reservationDate || reservation.reservationDate,
          updateData.startTime || reservation.startTime,
          updateData.duration || reservation.duration
        );

        if (betterTables.length === 0) {
          throw ApiError.badRequest(
            'No suitable tables available for the updated party size'
          );
        }

        updateData.tableId = betterTables[0].tableId;
      }

      updateData.partySize = data.partySize;
    }

    // Handle status changes
    if (data.status) {
      updateData.status = data.status;
    }

    if (data.specialRequests !== undefined) {
      updateData.specialRequests = data.specialRequests;
    }

    Object.assign(reservation, updateData);
    await this.reservationRepository.save(reservation);

    logger.info(`Reservation ${reservation.confirmationCode} updated`);

    // Invalidate cache
    await redisClient.delPattern(`availability:${reservation.restaurantId}:*`);
    await redisClient.delPattern(`reservations:${reservation.restaurantId}:*`);

    // Send notification
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: reservation.restaurantId },
    });
    const table = await this.tableRepository.findOne({
      where: { id: reservation.tableId },
    });

    await this.notificationService.sendConfirmation('modification', {
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      customerEmail: reservation.customerEmail,
      details: {
        restaurantName: restaurant?.name,
        reservationDate: reservation.reservationDate,
        reservationTime: reservation.startTime,
        partySize: reservation.partySize,
        tableNumber: table?.tableNumber,
        confirmationCode: reservation.confirmationCode,
      },
    });

    return reservation;
  }

  async cancelReservation(id: number): Promise<Reservation> {
    const reservation = await this.getReservationById(id);

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw ApiError.badRequest('Reservation is already cancelled');
    }

    reservation.status = ReservationStatus.CANCELLED;
    await this.reservationRepository.save(reservation);

    logger.info(`Reservation ${reservation.confirmationCode} cancelled`);

    // Invalidate cache
    await redisClient.delPattern(`availability:${reservation.restaurantId}:*`);
    await redisClient.delPattern(`reservations:${reservation.restaurantId}:*`);

    // Notify customer
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: reservation.restaurantId },
    });

    await this.notificationService.sendConfirmation('cancellation', {
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      customerEmail: reservation.customerEmail,
      details: {
        restaurantName: restaurant?.name,
        reservationDate: reservation.reservationDate,
        reservationTime: reservation.startTime,
        confirmationCode: reservation.confirmationCode,
      },
    });

    // Check waitlist
    await this.processWaitlist(
      reservation.restaurantId,
      reservation.reservationDate,
      reservation.startTime,
      reservation.tableId
    );

    return reservation;
  }

  private async processWaitlist(
    restaurantId: number,
    date: string,
    time: string,
    tableId: number
  ): Promise<void> {
    const waitlistEntries = await this.waitlistRepository.find({
      where: {
        restaurantId,
        waitlistDate: date,
        status: WaitlistStatus.WAITING,
      },
      relations: ['restaurant'],
      order: {
        position: 'ASC',
      },
    });

    if (waitlistEntries.length === 0) return;

    const table = await this.tableRepository.findOne({
      where: { id: tableId },
    });

    if (!table) return;

    for (const entry of waitlistEntries) {
      if (entry.partySize <= table.capacity) {
        // Notify customer
        await this.notificationService.notifyWaitlistAvailability(entry, {
          date,
          time,
          tableNumber: table.tableNumber,
        });

        entry.status = WaitlistStatus.NOTIFIED;
        entry.notifiedAt = new Date();
        await this.waitlistRepository.save(entry);

        logger.info(`Waitlist notification sent to ${entry.customerName}`);
        break;
      }
    }
  }
}
