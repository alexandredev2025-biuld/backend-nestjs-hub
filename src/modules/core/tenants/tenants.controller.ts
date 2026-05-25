import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenantService } from '../../../shared/services/tenant.service';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  @Roles('MASTER')
  @ApiOperation({ summary: 'Listar todos os tenants (apenas MASTER)' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Obter tenant por ID' })
  @ApiResponse({ status: 404, description: 'Tenant não encontrado' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    this.tenantService.assertTenantAccess(user.tenantId, id);
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @Roles('MASTER')
  @ApiOperation({ summary: 'Atualizar tenant (apenas MASTER)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: any,
  ) {
    this.tenantService.assertTenantAccess(user.tenantId, id);
    return this.tenantsService.update(id, dto);
  }
}
