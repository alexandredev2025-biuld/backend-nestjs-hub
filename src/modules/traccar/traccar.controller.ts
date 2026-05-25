import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TraccarService } from './traccar.service';

@ApiTags('Traccar (Proxy)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/traccar')
export class TraccarController {
  constructor(private readonly traccarService: TraccarService) {}

  @Get('devices')
  @Roles('MASTER', 'ADMIN', 'OPERATOR', 'VIEWER')
  @ApiOperation({ summary: 'Listar dispositivos do Traccar' })
  getDevices() {
    return this.traccarService.getDevices();
  }

  @Get('devices/:id')
  @Roles('MASTER', 'ADMIN', 'OPERATOR', 'VIEWER')
  @ApiOperation({ summary: 'Detalhes do dispositivo' })
  getDevice(@Param('id') id: number) {
    return this.traccarService.getDevice(Number(id));
  }

  @Get('positions')
  @Roles('MASTER', 'ADMIN', 'OPERATOR', 'VIEWER')
  @ApiOperation({ summary: 'Últimas posições' })
  @ApiQuery({ name: 'deviceId', required: false, type: [Number] })
  getPositions(@Query('deviceId') deviceId?: number | number[]) {
    const ids = deviceId !== undefined
      ? (Array.isArray(deviceId) ? deviceId : [Number(deviceId)])
      : undefined;
    return this.traccarService.getPositions(ids);
  }

  @Get('events')
  @Roles('MASTER', 'ADMIN', 'OPERATOR', 'VIEWER')
  @ApiOperation({ summary: 'Eventos do Traccar' })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getEvents(
    @Query('deviceId') deviceId?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.traccarService.getEvents(
      deviceId ? Number(deviceId) : undefined,
      from, to,
    );
  }
}
