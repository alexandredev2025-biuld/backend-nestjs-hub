import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useFactory: async (config: ConfigService) => {
        return new Pool({
          connectionString: config.get('DATABASE_URL'),
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['PG_POOL'],
})
export class DatabaseModule {}