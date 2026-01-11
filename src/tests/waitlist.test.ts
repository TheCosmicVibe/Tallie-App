import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';
import { Restaurant } from '../../src/models/Restaurant';

const API_PREFIX = '/api/v1';

describe('Waitlist API', () => {
  let restaurantId: number;

  beforeEach(async () => {
    const restaurant = AppDataSource.getRepository(Restaurant).create({
      name: 'Test Restaurant',
      openingTime: '10:00',
      closingTime: '22:00',
      totalTables: 10,
    });
    const savedRestaurant = await AppDataSource.getRepository(Restaurant).save(restaurant);
    restaurantId = savedRestaurant.id;
  });

  describe('POST /waitlist/restaurants/:restaurantId/waitlist', () => {
    it('should add customer to waitlist', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/waitlist/restaurants/${restaurantId}/waitlist`)
        .send({
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          customerEmail: 'john@example.com',
          partySize: 4,
          preferredTime: '19:00',
          notes: 'Prefer window seat',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('position');
      expect(response.body.data.position).toBe(1);
      expect(response.body.data.status).toBe('waiting');
    });

    it('should assign correct position in waitlist', async () => {
      // Add first customer
      await request(app)
        .post(`${API_PREFIX}/waitlist/restaurants/${restaurantId}/waitlist`)
        .send({
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          partySize: 4,
        });

      // Add second customer
      const response = await request(app)
        .post(`${API_PREFIX}/waitlist/restaurants/${restaurantId}/waitlist`)
        .send({
          customerName: 'Jane Smith',
          customerPhone: '+0987654321',
          partySize: 2,
        })
        .expect(201);

      expect(response.body.data.position).toBe(2);
    });
  });

  describe('GET /waitlist/restaurants/:restaurantId/waitlist', () => {
    beforeEach(async () => {
      await request(app)
        .post(`${API_PREFIX}/waitlist/restaurants/${restaurantId}/waitlist`)
        .send({
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          partySize: 4,
        });
    });

    it('should get waitlist for restaurant', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/waitlist/restaurants/${restaurantId}/waitlist`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});
