import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { CreateRestaurantDto, CreateTableDto } from '../types';
import { ApiError } from '../utils/ApiError';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export class RestaurantService {
  private readonly restaurantRepository = AppDataSource.getRepository(Restaurant);
  private readonly tableRepository = AppDataSource.getRepository(Table);

  async createRestaurant(data: CreateRestaurantDto): Promise<Restaurant> {
    const restaurant = this.restaurantRepository.create(data);
    await this.restaurantRepository.save(restaurant);
    
    logger.info(`Restaurant created: ${restaurant.name} (ID: ${restaurant.id})`);
    
    // Invalidate cache
    await redisClient.delPattern('restaurant:*');
    
    return restaurant;
  }

  async getRestaurantById(id: number): Promise<Restaurant> {
    const cacheKey = `restaurant:${id}`;
    
    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
      relations: ['tables'],
    });

    if (!restaurant) {
      throw ApiError.notFound('Restaurant not found');
    }

    // Cache the result
    await redisClient.set(cacheKey, JSON.stringify(restaurant), 3600);

    return restaurant;
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    const cacheKey = 'restaurants:all';
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const restaurants = await this.restaurantRepository.find({
      where: { isActive: true },
      relations: ['tables'],
      order: { name: 'ASC' },
    });

    await redisClient.set(cacheKey, JSON.stringify(restaurants), 1800);

    return restaurants;
  }

  async addTable(restaurantId: number, data: CreateTableDto): Promise<Table> {
    const restaurant = await this.getRestaurantById(restaurantId);

    // Check if table number already exists
    const existingTable = await this.tableRepository.findOne({
      where: {
        restaurantId,
        tableNumber: data.tableNumber,
      },
    });

    if (existingTable) {
      throw ApiError.conflict(
        `Table ${data.tableNumber} already exists in this restaurant`
      );
    }

    // Check if we've reached the total tables limit
    const currentTableCount = await this.tableRepository.count({
      where: { restaurantId },
    });

    if (currentTableCount >= restaurant.totalTables) {
      throw ApiError.badRequest(
        `Cannot add more tables. Restaurant limit: ${restaurant.totalTables}`
      );
    }

    const table = this.tableRepository.create({
      ...data,
      restaurantId,
    });

    await this.tableRepository.save(table);

    logger.info(
      `Table ${table.tableNumber} added to restaurant ${restaurant.name}`
    );

    // Invalidate cache
    await redisClient.delPattern(`restaurant:${restaurantId}*`);
    await redisClient.delPattern('availability:*');

    return table;
  }

  async getRestaurantWithAvailableTables(
    restaurantId: number,
    date: string,
    time: string
  ): Promise<{
    restaurant: Restaurant;
    availableTables: Table[];
    occupiedTables: Table[];
  }> {
    const restaurant = await this.getRestaurantById(restaurantId);

    const tables = await this.tableRepository
      .createQueryBuilder('table')
      .leftJoinAndSelect(
        'table.reservations',
        'reservation',
        'reservation.reservationDate = :date AND reservation.status NOT IN (:...statuses)',
        { date, statuses: ['cancelled', 'no_show'] }
      )
      .where('table.restaurantId = :restaurantId', { restaurantId })
      .andWhere('table.isActive = :isActive', { isActive: true })
      .getMany();

    const availableTables: Table[] = [];
    const occupiedTables: Table[] = [];

    for (const table of tables) {
      const isAvailable = !table.reservations.some((res) => {
        const requestTime = new Date(`2000-01-01 ${time}`);
        const resStart = new Date(`2000-01-01 ${res.startTime}`);
        const resEnd = new Date(`2000-01-01 ${res.endTime}`);

        return requestTime >= resStart && requestTime < resEnd;
      });

      if (isAvailable) {
        availableTables.push(table);
      } else {
        occupiedTables.push(table);
      }
    }

    return {
      restaurant,
      availableTables,
      occupiedTables,
    };
  }

  async updateTable(
    restaurantId: number,
    tableId: number,
    data: Partial<CreateTableDto>
  ): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { id: tableId, restaurantId },
    });

    if (!table) {
      throw ApiError.notFound('Table not found');
    }

    Object.assign(table, data);
    await this.tableRepository.save(table);

    logger.info(`Table ${table.tableNumber} updated`);

    // Invalidate cache
    await redisClient.delPattern(`restaurant:${restaurantId}*`);
    await redisClient.delPattern('availability:*');

    return table;
  }

  async deleteTable(restaurantId: number, tableId: number): Promise<void> {
    const table = await this.tableRepository.findOne({
      where: { id: tableId, restaurantId },
    });

    if (!table) {
      throw ApiError.notFound('Table not found');
    }

    await this.tableRepository.remove(table);

    logger.info(`Table ${table.tableNumber} deleted`);

    // Invalidate cache
    await redisClient.delPattern(`restaurant:${restaurantId}*`);
    await redisClient.delPattern('availability:*');
  }
}
