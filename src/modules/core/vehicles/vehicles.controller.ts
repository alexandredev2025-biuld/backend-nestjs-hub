import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@ApiTags('Veículos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @Roles('MASTER', 'ADMIN', 'OPERATOR', 'VIEWER')
  @ApiOperation({ summary: 'Listar veículos do tenant' })
  findAll(@CurrentUser() user: any) {
    return this.vehiclesService.findAll(user.tenantId);
  }

  @Get(':id')
  @Roles('MASTER', 'ADMIN', 'OPERATOR', 'VIEWER')
  @ApiOperation({ summary: 'Obter veículo por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.vehiclesService.findOne(user.tenantId, id);
  }

  @Post()
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Criar veículo (tenta sincronizar com Traccar)' })
  @ApiResponse({ status: 409, description: 'Placa já cadastrada' })
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: any) {
    return this.vehiclesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar veículo' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: any,
  ) {
    return this.vehiclesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('MASTER')
  @ApiOperation({ summary: 'Remover veículo (apenas MASTER)' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.vehiclesService.remove(user.tenantId, id);
    return { message: 'Veículo removido' };
  }

  @Post(':id/sync-traccar')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Sincronizar veículo pendente/falho com o Traccar' })
  @ApiResponse({ status: 200, description: 'Sincronizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  syncToTraccar(@Param('id') id: string, @CurrentUser() user: any) {
    return this.vehiclesService.syncToTraccar(id, user.tenantId);
  }

  @Post('sync-all/pending')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Sincronizar todos os veículos pendentes/falhos com o Traccar' })
  syncAllPending(@CurrentUser() user: any) {
    return this.vehiclesService.syncAllPending(user.tenantId);
  }
}
