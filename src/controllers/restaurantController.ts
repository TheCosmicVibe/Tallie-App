import { Request, Response } from 'express';
import { RestaurantService } from '../services/restaurantService';
import { CreateRestaurantDto, CreateTableDto } from '../types';

const restaurantService = new RestaurantService();

export class RestaurantController {
  async createRestaurant(req: Request, res: Response): Promise<void> {
    const data: CreateRestaurantDto = req.body;
    const restaurant = await restaurantService.createRestaurant(data);
    
    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      data: restaurant,
    });
  }

  async getRestaurant(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const restaurant = await restaurantService.getRestaurantById(id);
    
    res.json({
      success: true,
      data: restaurant,
    });
  }

  // changed req -> _req because the request object isn't used (avoids TS6133)
  async getAllRestaurants(_req: Request, res: Response): Promise<void> {
    const restaurants = await restaurantService.getAllRestaurants();
    
    res.json({
      success: true,
      data: restaurants,
    });
  }

  async getRestaurantAvailability(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const { date, time } = req.query;
    
    const result = await restaurantService.getRestaurantWithAvailableTables(
      id,
      date as string,
      time as string
    );
    
    res.json({
      success: true,
      data: result,
    });
  }

  async addTable(req: Request, res: Response): Promise<void> {
    const restaurantId = parseInt(req.params.id);
    const data: CreateTableDto = req.body;
    
    const table = await restaurantService.addTable(restaurantId, data);
    
    res.status(201).json({
      success: true,
      message: 'Table added successfully',
      data: table,
    });
  }

  async updateTable(req: Request, res: Response): Promise<void> {
    const restaurantId = parseInt(req.params.id);
    const tableId = parseInt(req.params.tableId);
    const data: Partial<CreateTableDto> = req.body;
    
    const table = await restaurantService.updateTable(restaurantId, tableId, data);
    
    res.json({
      success: true,
      message: 'Table updated successfully',
      data: table,
    });
  }

  async deleteTable(req: Request, res: Response): Promise<void> {
    const restaurantId = parseInt(req.params.id);
    const tableId = parseInt(req.params.tableId);
    
    await restaurantService.deleteTable(restaurantId, tableId);
    
    res.json({
      success: true,
      message: 'Table deleted successfully',
    });
  }
}
