import request from 'supertest';
import app from '../src/app';
import { AppDataSource } from '../src/config/database';
import { Restaurant } from '../src/models/Restaurant';

const API_PREFIX = '/api/v1';

describe('Restaurant API', () => {
  let restaurantId: number;

  describe('POST /restaurants', () => {
    it('should create a new restaurant', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/restaurants`)
        .send({
          name: 'The Grand Restaurant',
          openingTime: '10:00',
          closingTime: '22:00',
          totalTables: 20,
          address: '123 Main St',
          phone: '+1234567890',
          email: 'info@grandrestaurant.com',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('The Grand Restaurant');
      
      restaurantId = response.body.data.id;
    });

    it('should fail with invalid opening time', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/restaurants`)
        .send({
          name: 'Test Restaurant',
          openingTime: '25:00', // Invalid
          closingTime: '22:00',
          totalTables: 10,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/restaurants`)
        .send({
          name: 'Test Restaurant',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /restaurants', () => {
    beforeEach(async () => {
      // Create test restaurant
      const restaurant = AppDataSource.getRepository(Restaurant).create({
        name: 'Test Restaurant',
        openingTime: '10:00',
        closingTime: '22:00',
        totalTables: 15,
      });
      const saved = await AppDataSource.getRepository(Restaurant).save(restaurant);
      restaurantId = saved.id;
    });

    it('should get all restaurants', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/restaurants`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get a specific restaurant by ID', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/restaurants/${restaurantId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(restaurantId);
      expect(response.body.data.name).toBe('Test Restaurant');
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/restaurants/99999`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /restaurants/:id/tables', () => {
    beforeEach(async () => {
      const restaurant = AppDataSource.getRepository(Restaurant).create({
        name: 'Test Restaurant',
        openingTime: '10:00',
        closingTime: '22:00',
        totalTables: 15,
      });
      const saved = await AppDataSource.getRepository(Restaurant).save(restaurant);
      restaurantId = saved.id;
    });

    it('should add a table to restaurant', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/restaurants/${restaurantId}/tables`)
        .send({
          tableNumber: 'T1',
          capacity: 4,
          location: 'Window seat',
          isActive: true,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tableNumber).toBe('T1');
      expect(response.body.data.capacity).toBe(4);
    });

    it('should fail to add duplicate table number', async () => {
      await request(app)
        .post(`${API_PREFIX}/restaurants/${restaurantId}/tables`)
        .send({
          tableNumber: 'T1',
          capacity: 4,
        })
        .expect(201);

      const response = await request(app)
        .post(`${API_PREFIX}/restaurants/${restaurantId}/tables`)
        .send({
          tableNumber: 'T1',
          capacity: 6,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });
});
