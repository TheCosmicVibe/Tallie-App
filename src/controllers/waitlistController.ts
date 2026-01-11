import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Waitlist } from '../models/Waitlist';
import { Restaurant } from '../models/Restaurant';
import { CreateWaitlistDto, WaitlistStatus } from '../types';
import { ApiError } from '../utils/ApiError';
import { NotificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

const waitlistRepository = AppDataSource.getRepository(Waitlist);
const restaurantRepository = AppDataSource.getRepository(Restaurant);
const notificationService = new NotificationService();

export class WaitlistController {
  async addToWaitlist(req: Request, res: Response): Promise<void> {
    const restaurantId = parseInt(req.params.restaurantId);
    const data: CreateWaitlistDto = req.body;
    
    const restaurant = await restaurantRepository.findOne({
      where: { id: restaurantId },
    });
    
    if (!restaurant) {
      throw ApiError.notFound('Restaurant not found');
    }
    
    // Get current date for waitlist
    const waitlistDate = new Date().toISOString().split('T')[0];
    
    // Get current position
    const currentCount = await waitlistRepository.count({
      where: {
        restaurantId,
        waitlistDate,
        status: WaitlistStatus.WAITING,
      },
    });
    
    const waitlist = waitlistRepository.create({
      ...data,
      restaurantId,
      waitlistDate,
      position: currentCount + 1,
      status: WaitlistStatus.WAITING,
    });
    
    await waitlistRepository.save(waitlist);
    
    logger.info(`${data.customerName} added to waitlist at position ${waitlist.position}`);
    
    // Send notification
    await notificationService.sendConfirmation('waitlist', {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      details: {
        restaurantName: restaurant.name,
        waitlistDate,
        partySize: data.partySize,
        position: waitlist.position,
      },
    });
    
    res.status(201).json({
      success: true,
      message: 'Added to waitlist successfully',
      data: waitlist,
    });
  }

  async getWaitlist(req: Request, res: Response): Promise<void> {
    const restaurantId = parseInt(req.params.restaurantId);
    const { date } = req.query;
    
    const waitlistDate = (date as string) || new Date().toISOString().split('T')[0];
    
    const waitlist = await waitlistRepository.find({
      where: {
        restaurantId,
        waitlistDate,
      },
      order: {
        position: 'ASC',
      },
    });
    
    res.json({
      success: true,
      data: waitlist,
    });
  }

  async updateWaitlistStatus(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    const waitlistEntry = await waitlistRepository.findOne({
      where: { id },
    });
    
    if (!waitlistEntry) {
      throw ApiError.notFound('Waitlist entry not found');
    }
    
    waitlistEntry.status = status;
    
    if (status === WaitlistStatus.SEATED || status === WaitlistStatus.CANCELLED) {
      // Reorder remaining waitlist
      await this.reorderWaitlist(
        waitlistEntry.restaurantId,
        waitlistEntry.waitlistDate
      );
    }
    
    await waitlistRepository.save(waitlistEntry);
    
    res.json({
      success: true,
      message: 'Waitlist status updated successfully',
      data: waitlistEntry,
    });
  }

  private async reorderWaitlist(restaurantId: number, date: string): Promise<void> {
    const waitlist = await waitlistRepository.find({
      where: {
        restaurantId,
        waitlistDate: date,
        status: WaitlistStatus.WAITING,
      },
      order: {
        position: 'ASC',
      },
    });
    
    for (let i = 0; i < waitlist.length; i++) {
      waitlist[i].position = i + 1;
    }
    
    await waitlistRepository.save(waitlist);
  }

  async removeFromWaitlist(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    
    const waitlistEntry = await waitlistRepository.findOne({
      where: { id },
    });
    
    if (!waitlistEntry) {
      throw ApiError.notFound('Waitlist entry not found');
    }
    
    await waitlistRepository.remove(waitlistEntry);
    
    // Reorder remaining waitlist
    await this.reorderWaitlist(
      waitlistEntry.restaurantId,
      waitlistEntry.waitlistDate
    );
    
    res.json({
      success: true,
      message: 'Removed from waitlist successfully',
    });
  }
}
