import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to Supabase PostgreSQL database.');
    } catch (error) {
      this.logger.warn(
        'Database connection failed on startup. Please ensure DATABASE_URL in .env is configured with your Supabase credentials: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
