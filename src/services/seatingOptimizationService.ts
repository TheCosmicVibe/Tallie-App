import { AppDataSource } from '../config/database';
import { Table } from '../models/Table';
import { Reservation } from '../models/Reservation';
import { TableSuggestion } from '../types';
import { TimeHelper } from '../utils/timeHelper';
import { Between } from 'typeorm';

export class SeatingOptimizationService {
  private readonly tableRepository = AppDataSource.getRepository(Table);
  private readonly reservationRepository = AppDataSource.getRepository(Reservation);

  async suggestOptimalTable(
    restaurantId: number,
    partySize: number,
    reservationDate: string,
    startTime: string,
    duration: number
  ): Promise<TableSuggestion[]> {
    // Get all active tables for the restaurant
    const tables = await this.tableRepository.find({
      where: {
        restaurantId,
        isActive: true,
      },
      order: {
        capacity: 'ASC',
      },
    });

    const endTime = TimeHelper.addMinutesToTime(startTime, duration);

    // Get existing reservations for the time slot
    const { start, end } = TimeHelper.getDayBoundaries(reservationDate);
    const existingReservations = await this.reservationRepository.find({
      where: {
        restaurantId,
        reservationDate,
        createdAt: Between(start, end),
      },
    });

    const suggestions: TableSuggestion[] = [];

    for (const table of tables) {
      const score = this.calculateTableScore(
        table,
        partySize,
        startTime,
        endTime,
        existingReservations
      );

      if (score > 0) {
        suggestions.push({
          tableId: table.id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          reason: this.generateReason(table, partySize, score),
          score,
        });
      }
    }

    // Sort by score (descending)
    return suggestions.sort((a, b) => b.score - a.score);
  }

  private calculateTableScore(
    table: Table,
    partySize: number,
    startTime: string,
    endTime: string,
    existingReservations: Reservation[]
  ): number {
    let score = 100;

    // Can't accommodate party size
    if (table.capacity < partySize) {
      return 0;
    }

    // Check for conflicts
    const hasConflict = existingReservations.some((res) => {
      if (res.tableId !== table.id) return false;

      return TimeHelper.hasOverlap(
        TimeHelper.parseTime(startTime),
        TimeHelper.parseTime(endTime),
        TimeHelper.parseTime(res.startTime),
        TimeHelper.parseTime(res.endTime)
      );
    });

    if (hasConflict) {
      return 0;
    }

    // Perfect fit - no wasted seats
    if (table.capacity === partySize) {
      score += 50;
    }

    // Small overage acceptable (1-2 extra seats)
    const overage = table.capacity - partySize;
    if (overage === 1) {
      score += 30;
    } else if (overage === 2) {
      score += 20;
    } else if (overage > 2) {
      // Penalize large overages
      score -= overage * 5;
    }

    // Prefer tables by location (could be enhanced with location data)
    if (table.location) {
      if (table.location.toLowerCase().includes('window')) {
        score += 10;
      }
      if (table.location.toLowerCase().includes('quiet')) {
        score += 5;
      }
    }

    // Count existing reservations for this table (prefer less busy tables)
    const tableReservationCount = existingReservations.filter(
      (res) => res.tableId === table.id
    ).length;
    score -= tableReservationCount * 3;

    return Math.max(score, 0);
  }

  private generateReason(
    table: Table,
    partySize: number,
    score: number
  ): string {
    const reasons: string[] = [];

    if (table.capacity === partySize) {
      reasons.push('Perfect fit for your party');
    } else if (table.capacity - partySize === 1) {
      reasons.push('Excellent fit with minimal extra space');
    } else if (table.capacity - partySize === 2) {
      reasons.push('Good fit with comfortable spacing');
    } else {
      reasons.push(`Accommodates ${table.capacity} guests`);
    }

    if (table.location) {
      reasons.push(`Located in ${table.location}`);
    }

    if (score > 120) {
      reasons.push('Highly recommended');
    } else if (score > 100) {
      reasons.push('Recommended');
    }

    return reasons.join(', ');
  }

  async redistributeReservations(
    restaurantId: number,
    date: string
  ): Promise<{ optimized: number; suggestions: any[] }> {
    // Get all confirmed reservations for the date
    const reservations = await this.reservationRepository.find({
      where: {
        restaurantId,
        reservationDate: date,
        status: 'confirmed',
      },
      relations: ['table'],
      order: {
        startTime: 'ASC',
      },
    });

    const suggestions: any[] = [];
    let optimizedCount = 0;

    for (const reservation of reservations) {
      const betterTables = await this.suggestOptimalTable(
        restaurantId,
        reservation.partySize,
        reservation.reservationDate,
        reservation.startTime,
        reservation.duration
      );

      const currentTableScore = this.calculateTableScore(
        reservation.table,
        reservation.partySize,
        reservation.startTime,
        reservation.endTime,
        reservations.filter((r) => r.id !== reservation.id)
      );

      if (betterTables.length > 0 && betterTables[0].score > currentTableScore + 20) {
        suggestions.push({
          reservationId: reservation.id,
          currentTable: reservation.table.tableNumber,
          suggestedTable: betterTables[0].tableNumber,
          improvement: betterTables[0].score - currentTableScore,
          reason: betterTables[0].reason,
        });
        optimizedCount++;
      }
    }

    return {
      optimized: optimizedCount,
      suggestions,
    };
  }
}
