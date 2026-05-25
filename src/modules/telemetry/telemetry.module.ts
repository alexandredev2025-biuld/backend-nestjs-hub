import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { TelemetryConsumer } from './telemetry.consumer';

@Module({
  controllers: [TelemetryController],
  providers: [TelemetryService, TelemetryConsumer],
})
export class TelemetryModule {}