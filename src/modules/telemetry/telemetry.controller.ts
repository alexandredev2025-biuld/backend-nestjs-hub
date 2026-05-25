import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

@Controller('v1/telemetry/traccar')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('positions')
  @HttpCode(HttpStatus.ACCEPTED)
  async ingestPositions(@Body() payload: any[]) {
    await this.telemetryService.queuePositions(payload);
    return { status: 'queued', count: payload.length };
  }
}