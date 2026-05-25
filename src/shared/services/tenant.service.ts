import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class TenantService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async getTenantById(id: string) {
    const { rows } = await this.pool.query(
      'SELECT id, name, slug, product FROM "Tenant" WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  }

  async getVehiclesByTenant(tenantId: string) {
    const { rows } = await this.pool.query(
      'SELECT id, plate, model, status FROM "Vehicle" WHERE "tenantId" = $1 ORDER BY plate',
      [tenantId],
    );
    return rows;
  }

  async getVehicleByPlate(tenantId: string, plate: string) {
    const { rows } = await this.pool.query(
      'SELECT id, plate, model, status FROM "Vehicle" WHERE "tenantId" = $1 AND plate = $2',
      [tenantId, plate],
    );
    return rows[0] || null;
  }

  assertTenantAccess(userTenantId: string, targetTenantId: string) {
    if (userTenantId !== targetTenantId) {
      throw new ForbiddenException('Acesso negado a recurso de outro tenant');
    }
  }
}
