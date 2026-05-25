import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FeatureGuard } from '../../shared/features/feature.guard';
import { RequiresFeature } from '../../shared/features/feature.decorator';
import { Feature } from '../../shared/features/feature.enum';

@ApiTags('Rotas (OtimiBus)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Controller('v1/routes')
export class RoutesController {
  @Get()
  @Roles('MASTER', 'ADMIN', 'OPERATOR', 'VIEWER')
  @RequiresFeature(Feature.ROUTES_MANAGEMENT)
  @ApiOperation({ summary: 'Listar rotas (exclusivo OtimiBus)' })
  findAll() {
    return [
      { id: 1, code: 'R-001', name: 'Terminal Central → Bairro Novo' },
      { id: 2, code: 'R-002', name: 'Rodoviária → Shopping' },
      { id: 3, code: 'R-003', name: 'Aeroporto → Centro' },
    ];
  }

  @Post()
  @Roles('MASTER', 'ADMIN')
  @RequiresFeature(Feature.ROUTES_MANAGEMENT)
  @ApiOperation({ summary: 'Criar rota (exclusivo OtimiBus)' })
  create() {
    return { message: 'Rota criada (exemplo)' };
  }
}
