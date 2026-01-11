import { AppDataSource } from '../src/config/database';
import { redisClient } from '../src/config/redis';

beforeAll(async () => {
  // Initialize test database
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  
  // Initialize Redis
  await redisClient.connect();
  
  // Clear database
  await AppDataSource.synchronize(true);
});

afterAll(async () => {
  // Close connections
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  
  await redisClient.disconnect();
});

afterEach(async () => {
  // Clear all tables after each test
  const entities = AppDataSource.entityMetadatas;
  
  for (const entity of entities) {
    const repository = AppDataSource.getRepository(entity.name);
    await repository.clear();
  }
  
  // Clear Redis cache
  await redisClient.delPattern('*');
});
