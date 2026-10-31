import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { RedisCacheService } from './cache/redis-cache.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const mockCacheService = {
      getStatus: () => ({ isConnected: true }),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: RedisCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health status', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.service).toBe('Apartment Utility & Room Management System API');
      expect(health.cache).toEqual({ isConnected: true });
    });
  });
});
