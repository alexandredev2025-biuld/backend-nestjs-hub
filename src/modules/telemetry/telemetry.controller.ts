import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { TraccarEventDto } from './dto/traccar-event.dto';

@ApiTags('Telemetria')
@Controller('v1/telemetry/traccar')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('positions')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingerir posições GPS do Traccar' })
  @ApiResponse({ status: 202, description: 'Posições enfileiradas' })
  async ingestPositions(@Body() payload: any[]) {
    await this.telemetryService.queuePositions(payload);
    return { status: 'queued', count: payload.length };
  }

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingerir eventos do Traccar' })
  @ApiResponse({ status: 202, description: 'Eventos armazenados' })
  async ingestEvents(@Body() payload: TraccarEventDto | TraccarEventDto[]) {
    const events = Array.isArray(payload) ? payload : [payload];
    await this.telemetryService.storeEvents(events);
    return { status: 'stored', count: events.length };
  }
}
