import { AvailabilityService } from '../../src/services/availabilityService';
import { AppDataSource } from '../../src/config/database';
import { Restaurant } from '../../src/models/Restaurant';
import { Table } from '../../src/models/Table';
import { Reservation } from '../../src/models/Reservation';
import { ReservationStatus } from '../../src/types';

describe('Availability Service', () => {
  let availabilityService: AvailabilityService;
  let restaurantId: number;
  let tableId: number;

  beforeAll(() => {
    availabilityService = new AvailabilityService();
  });

  beforeEach(async () => {
    const restaurant = AppDataSource.getRepository(Restaurant).create({
      name: 'Test Restaurant',
      openingTime: '10:00',
      closingTime: '22:00',
      totalTables: 10,
    });

    const savedRestaurant = await AppDataSource.getRepository(Restaurant).save(restaurant);
    restaurantId = savedRestaurant.id;

    const table = AppDataSource.getRepository(Table).create({
      restaurantId,
      tableNumber: 'T1',
      capacity: 4,
      isActive: true,
    });

    const savedTable = await AppDataSource.getRepository(Table).save(table);
    tableId = savedTable.id;
  });

  describe('checkAvailability', () => {
    it('should return available time slots', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      const result = await availabilityService.checkAvailability({
        restaurantId,
        date,
        partySize: 4,
        duration: 120,
      });

      expect(result).toHaveProperty('availableSlots');
      expect(result.availableSlots.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('suggestedTables');
    });

    it('should not show slots when restaurant is fully booked', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      const reservation = AppDataSource.getRepository(Reservation).create({
        restaurantId,
        tableId,
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        partySize: 4,
        reservationDate: date,
        startTime: '10:00',
        endTime: '22:00',
        duration: 720,
        status: ReservationStatus.CONFIRMED,
        confirmationCode: 'TEST123',
      });

      await AppDataSource.getRepository(Reservation).save(reservation);

      const result = await availabilityService.checkAvailability({
        restaurantId,
        date,
        partySize: 4,
        duration: 120,
      });

      expect(result.availableSlots.length).toBe(0);
    });
  });

  describe('isTableAvailable', () => {
    it('should return true for available table', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      const result = await availabilityService.isTableAvailable(
        tableId,
        date,
        '19:00',
        '21:00'
      );

      expect(result).toBe(true);
    });

    it('should return false for occupied table', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      const reservation = AppDataSource.getRepository(Reservation).create({
        restaurantId,
        tableId,
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        partySize: 4,
        reservationDate: date,
        startTime: '19:00',
        endTime: '21:00',
        duration: 120,
        status: ReservationStatus.CONFIRMED,
        confirmationCode: 'TEST123',
      });

      await AppDataSource.getRepository(Reservation).save(reservation);

      const result = await availabilityService.isTableAvailable(
        tableId,
        date,
        '20:00',
        '22:00'
      );

      expect(result).toBe(false);
    });
  });
});
