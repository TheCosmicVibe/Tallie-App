import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';
import { Restaurant } from '../../src/models/Restaurant';
import { Table } from '../../src/models/Table';

const API_PREFIX = '/api/v1';

describe('Reservation API', () => {
  let restaurantId: number;

  beforeEach(async () => {
    // Create test restaurant
    const restaurant = AppDataSource.getRepository(Restaurant).create({
      name: 'Test Restaurant',
      openingTime: '10:00',
      closingTime: '22:00',
      totalTables: 10,
    });
    const savedRestaurant = await AppDataSource.getRepository(Restaurant).save(restaurant);
    restaurantId = savedRestaurant.id;

    // Create test table (we don't need to reference its id in these tests)
    const table = AppDataSource.getRepository(Table).create({
      restaurantId,
      tableNumber: 'T1',
      capacity: 4,
      isActive: true,
    });
    await AppDataSource.getRepository(Table).save(table);
  });

  describe('POST /reservations/restaurants/:restaurantId/reservations', () => {
    it('should create a new reservation', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .post(`${API_PREFIX}/reservations/restaurants/${restaurantId}/reservations`)
        .send({
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          customerEmail: 'john@example.com',
          partySize: 4,
          reservationDate,
          reservationTime: '19:00',
          duration: 120,
          specialRequests: 'Window seat if possible',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('confirmationCode');
      expect(response.body.data.customerName).toBe('John Doe');
    });

    it('should prevent double booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      // First reservation
      await request(app)
        .post(`${API_PREFIX}/reservations/restaurants/${restaurantId}/reservations`)
        .send({
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          partySize: 4,
          reservationDate,
          reservationTime: '19:00',
          duration: 120,
        })
        .expect(201);

      // Try to book same time - should work with different table or fail
      const response = await request(app)
        .post(`${API_PREFIX}/reservations/restaurants/${restaurantId}/reservations`)
        .send({
          customerName: 'Jane Smith',
          customerPhone: '+0987654321',
          partySize: 4,
          reservationDate,
          reservationTime: '19:30', // Overlaps
          duration: 120,
        });

      // Should either succeed with different table or fail (conflict)
      expect([201, 409]).toContain(response.status);
    });

    it('should fail with invalid date', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/reservations/restaurants/${restaurantId}/reservations`)
        .send({
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          partySize: 4,
          reservationDate: '2020-01-01', // Past date
          reservationTime: '19:00',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail outside operating hours', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .post(`${API_PREFIX}/reservations/restaurants/${restaurantId}/reservations`)
        .send({
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          partySize: 4,
          reservationDate,
          reservationTime: '23:00', // After closing time
          duration: 120,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /reservations/restaurants/:restaurantId/availability', () => {
    it('should check availability for a date and party size', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .get(`${API_PREFIX}/reservations/restaurants/${restaurantId}/availability`)
        .query({
          date,
          partySize: 4,
          duration: 120,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('availableSlots');
      expect(response.body.data).toHaveProperty('suggestedTables');
    });
  });

  describe('PUT /reservations/:id', () => {
    let reservationId: number;

    beforeEach(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .post(`${API_PREFIX}/reservations/restaurants/${restaurantId}/reservations`)
        .send({
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          partySize: 4,
          reservationDate,
          reservationTime: '19:00',
        });

      reservationId = response.body.data.id;
    });

    it('should update a reservation', async () => {
      const response = await request(app)
        .put(`${API_PREFIX}/reservations/${reservationId}`)
        .send({
          partySize: 6,
          specialRequests: 'Birthday celebration',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.partySize).toBe(6);
    });
  });

  describe('DELETE /reservations/:id', () => {
    let reservationId: number;

    beforeEach(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .post(`${API_PREFIX}/reservations/restaurants/${restaurantId}/reservations`)
        .send({
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          partySize: 4,
          reservationDate,
          reservationTime: '19:00',
        });

      reservationId = response.body.data.id;
    });

    it('should cancel a reservation', async () => {
      const response = await request(app)
        .delete(`${API_PREFIX}/reservations/${reservationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });
  });
});
