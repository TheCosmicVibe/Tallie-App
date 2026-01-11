import { AppDataSource } from '../config/database';
import { Table } from '../models/Table';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import {
  AvailabilityRequest,
  AvailabilityResponse,
  TimeSlot,
} from '../types';
import { TimeHelper } from '../utils/timeHelper';
import { ApiError } from '../utils/ApiError';
import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { Between } from 'typeorm';

export class AvailabilityService {
  private readonly restaurantRepository = AppDataSource.getRepository(Restaurant);
  private readonly tableRepository = AppDataSource.getRepository(Table);
  private readonly reservationRepository = AppDataSource.getRepository(Reservation);

  async checkAvailability(
    request: AvailabilityRequest
  ): Promise<AvailabilityResponse> {
    const { restaurantId, date, partySize, duration } = request;
    const reservationDuration = duration || env.DEFAULT_RESERVATION_DURATION;

    // Try cache first
    const cacheKey = `availability:${restaurantId}:${date}:${partySize}:${reservationDuration}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw ApiError.notFound('Restaurant not found');
    }

    // Get all tables that can accommodate the party
    const suitableTables = await this.tableRepository.find({
      where: {
        restaurantId,
        isActive: true,
      },
    });

    const capableTables = suitableTables.filter(
      (table) => table.capacity >= partySize
    );

    if (capableTables.length === 0) {
      return {
        date,
        partySize,
        availableSlots: [],
        suggestedTables: [],
      };
    }

    // Get all reservations for the date
    const { start, end } = TimeHelper.getDayBoundaries(date);
    const reservations = await this.reservationRepository.find({
      where: {
        restaurantId,
        reservationDate: date,
        status: Between('pending' as any, 'confirmed' as any),
        createdAt: Between(start, end),
      },
    });

    // Generate time slots
    const timeSlots = TimeHelper.generateTimeSlots(
      restaurant.openingTime,
      restaurant.closingTime,
      30 // 30-minute intervals
    );

    const availableSlots: TimeSlot[] = [];

    for (const slotTime of timeSlots) {
      const slotEndTime = TimeHelper.addMinutesToTime(
        slotTime,
        reservationDuration
      );

      // Check if slot is within operating hours
      const slotDateTime = TimeHelper.parseDateTime(date, slotTime);
      if (
        !TimeHelper.isWithinOperatingHours(
          slotDateTime,
          restaurant.openingTime,
          restaurant.closingTime
        )
      ) {
        continue;
      }

      // Check if slot end time is within operating hours
      const slotEndDateTime = TimeHelper.parseDateTime(date, slotEndTime);
      if (
        !TimeHelper.isWithinOperatingHours(
          slotEndDateTime,
          restaurant.openingTime,
          restaurant.closingTime
        )
      ) {
        continue;
      }

      // Find available tables for this slot
      const availableTables = capableTables.filter((table) => {
        return !reservations.some((reservation) => {
          if (reservation.tableId !== table.id) return false;

          return TimeHelper.hasOverlap(
            TimeHelper.parseTime(slotTime),
            TimeHelper.parseTime(slotEndTime),
            TimeHelper.parseTime(reservation.startTime),
            TimeHelper.parseTime(reservation.endTime)
          );
        });
      });

      if (availableTables.length > 0) {
        availableSlots.push({
          startTime: slotTime,
          endTime: slotEndTime,
          availableTables: availableTables.map((t) => t.id),
        });
      }
    }

    // Get table suggestions
    const SeatingOptimizationService = (await import('./seatingOptimizationService')).SeatingOptimizationService;
    const seatingService = new SeatingOptimizationService();
    
    const suggestedTables = availableSlots.length > 0
      ? await seatingService.suggestOptimalTable(
          restaurantId,
          partySize,
          date,
          availableSlots[0].startTime,
          reservationDuration
        )
      : [];

    const response: AvailabilityResponse = {
      date,
      partySize,
      availableSlots,
      suggestedTables: suggestedTables.slice(0, 3), // Top 3 suggestions
    };

    // Cache the result
    await redisClient.set(cacheKey, JSON.stringify(response), 1800); // 30 minutes

    return response;
  }

  async isTableAvailable(
    tableId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: number
  ): Promise<boolean> {
    const query = this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.tableId = :tableId', { tableId })
      .andWhere('reservation.reservationDate = :date', { date })
      .andWhere('reservation.status NOT IN (:...statuses)', {
        statuses: ['cancelled', 'no_show'],
      });

    if (excludeReservationId) {
      query.andWhere('reservation.id != :excludeReservationId', {
        excludeReservationId,
      });
    }

    const reservations = await query.getMany();

    for (const reservation of reservations) {
      if (
        TimeHelper.hasOverlap(
          TimeHelper.parseTime(startTime),
          TimeHelper.parseTime(endTime),
          TimeHelper.parseTime(reservation.startTime),
          TimeHelper.parseTime(reservation.endTime)
        )
      ) {
        return false;
      }
    }

    return true;
  }

  async findAlternativeSlots(
    restaurantId: number,
    date: string,
    partySize: number,
    preferredTime: string,
    duration: number
  ): Promise<TimeSlot[]> {
    const availability = await this.checkAvailability({
      restaurantId,
      date,
      partySize,
      duration,
    });

    if (availability.availableSlots.length === 0) {
      return [];
    }

    // Sort slots by proximity to preferred time
    const preferredDateTime = TimeHelper.parseTime(preferredTime);

    return availability.availableSlots
      .map((slot) => ({
        ...slot,
        timeDiff: Math.abs(
          TimeHelper.getDurationInMinutes(
            preferredDateTime,
            TimeHelper.parseTime(slot.startTime)
          )
        ),
      }))
      .sort((a, b) => a.timeDiff - b.timeDiff)
      .slice(0, 5) // Return top 5 alternatives
      .map(({ timeDiff, ...slot }) => slot);
  }
}
