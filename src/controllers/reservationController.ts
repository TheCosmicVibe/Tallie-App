import { Request, Response } from 'express';
import { ReservationService } from '../services/reservationService';
import { AvailabilityService } from '../services/availabilityService';
import { CreateReservationDto, UpdateReservationDto, AvailabilityRequest } from '../types';

const reservationService = new ReservationService();
const availabilityService = new AvailabilityService();

export class ReservationController {
  async createReservation(req: Request, res: Response): Promise<void> {
    const restaurantId = parseInt(req.params.restaurantId);
    const data: CreateReservationDto = req.body;
    
    const reservation = await reservationService.createReservation(restaurantId, data);
    
    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: reservation,
    });
  }

  async getReservation(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const reservation = await reservationService.getReservationById(id);
    
    res.json({
      success: true,
      data: reservation,
    });
  }

  async getReservationsByDate(req: Request, res: Response): Promise<void> {
    const restaurantId = parseInt(req.params.restaurantId);
    const { date } = req.query;
    
    const reservations = await reservationService.getReservationsByRestaurant(
      restaurantId,
      date as string
    );
    
    res.json({
      success: true,
      data: reservations,
    });
  }

  async updateReservation(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const data: UpdateReservationDto = req.body;
    
    const reservation = await reservationService.updateReservation(id, data);
    
    res.json({
      success: true,
      message: 'Reservation updated successfully',
      data: reservation,
    });
  }

  async cancelReservation(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const reservation = await reservationService.cancelReservation(id);
    
    res.json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: reservation,
    });
  }

  async checkAvailability(req: Request, res: Response): Promise<void> {
    const restaurantId = parseInt(req.params.restaurantId);
    const { date, partySize, duration } = req.query;
    
    const request: AvailabilityRequest = {
      restaurantId,
      date: date as string,
      partySize: parseInt(partySize as string),
      duration: duration ? parseInt(duration as string) : undefined,
    };
    
    const availability = await availabilityService.checkAvailability(request);
    
    res.json({
      success: true,
      data: availability,
    });
  }
}
