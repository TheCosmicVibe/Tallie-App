import { SeatingOptimizationService } from '../../src/services/seatingOptimizationService';
import { AppDataSource } from '../../src/config/database';
import { Restaurant } from '../../src/models/Restaurant';
import { Table } from '../../src/models/Table';

describe('Seating Optimization Service', () => {
  let seatingService: SeatingOptimizationService;
  let restaurantId: number;

  beforeAll(() => {
    seatingService = new SeatingOptimizationService();
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

    // Create tables with different capacities
    const tables = [
      { tableNumber: 'T1', capacity: 2 },
      { tableNumber: 'T2', capacity: 4 },
      { tableNumber: 'T3', capacity: 4 },
      { tableNumber: 'T4', capacity: 6 },
      { tableNumber: 'T5', capacity: 8 },
    ];

    for (const tableData of tables) {
      const table = AppDataSource.getRepository(Table).create({
        ...tableData,
        restaurantId,
        isActive: true,
      });
      await AppDataSource.getRepository(Table).save(table);
    }
  });

  describe('suggestOptimalTable', () => {
    it('should suggest perfect fit table', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      const suggestions = await seatingService.suggestOptimalTable(
        restaurantId,
        4,
        date,
        '19:00',
        120
      );

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should suggest table with capacity 4 (perfect fit)
      const topSuggestion = suggestions[0];
      expect(topSuggestion.capacity).toBe(4);
      expect(topSuggestion.score).toBeGreaterThan(100);
    });

    it('should not suggest tables with insufficient capacity', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      const suggestions = await seatingService.suggestOptimalTable(
        restaurantId,
        6,
        date,
        '19:00',
        120
      );

      // All suggested tables should accommodate party of 6
      for (const suggestion of suggestions) {
        expect(suggestion.capacity).toBeGreaterThanOrEqual(6);
      }
    });

    it('should return empty array when no tables available', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      // Try to book party of 10 (larger than any table)
      const suggestions = await seatingService.suggestOptimalTable(
        restaurantId,
        10,
        date,
        '19:00',
        120
      );

      expect(suggestions.length).toBe(0);
    });
  });
});
