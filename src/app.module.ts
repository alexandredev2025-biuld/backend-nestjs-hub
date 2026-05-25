import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './shared/database/database.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    TelemetryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
