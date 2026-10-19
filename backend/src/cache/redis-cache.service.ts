import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number | null;
}

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redisClient: Redis | null = null;
  private isRedisAvailable = false;
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = Number(this.configService.get<number>('REDIS_PORT', 6379));
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD', '');
    const redisUrl = this.configService.get<string>('REDIS_URL', '');

    try {
      if (redisUrl) {
        this.redisClient = new Redis(redisUrl, {
          lazyConnect: true,
          retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 2000)),
          maxRetriesPerRequest: 1,
        });
      } else {
        this.redisClient = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword || undefined,
          lazyConnect: true,
          retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 2000)),
          maxRetriesPerRequest: 1,
        });
      }

      this.redisClient.on('connect', () => {
        this.isRedisAvailable = true;
        this.logger.log('Connected to Redis server for caching.');
      });

      this.redisClient.on('error', (err) => {
        if (this.isRedisAvailable) {
          this.logger.warn(`Redis error, falling back to memory cache: ${err.message}`);
        }
        this.isRedisAvailable = false;
      });

      // Try connecting with short timeout
      await Promise.race([
        this.redisClient.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 1500)),
      ]);
      this.isRedisAvailable = true;
      this.logger.log(`Redis cache active at ${redisHost}:${redisPort}`);
    } catch {
      this.isRedisAvailable = false;
      this.logger.log('Redis server not reachable; using high-speed in-memory cache as fallback.');
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        // ignore disconnect errors
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
      } catch (err) {
        this.logger.warn(`Redis get error for ${key}: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Memory cache fallback
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return JSON.parse(item.value) as T;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
        return;
      } catch (err) {
        this.logger.warn(`Redis set error for ${key}: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Memory cache fallback
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryCache.set(key, { value: serialized, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {
        this.logger.warn(`Redis del error for ${key}: ${err instanceof Error ? err.message : err}`);
      }
    }
    this.memoryCache.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (err) {
        this.logger.warn(`Redis delPattern error: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Clear matching memory keys
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryCache.keys()) {
      if (regexPattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  getStatus() {
    return {
      provider: this.isRedisAvailable ? 'redis' : 'in-memory',
      isRedisAvailable: this.isRedisAvailable,
      memoryKeysCount: this.memoryCache.size,
    };
  }
}
