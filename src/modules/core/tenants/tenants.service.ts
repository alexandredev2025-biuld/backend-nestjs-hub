import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll() {
    const { rows } = await this.pool.query(
      'SELECT id, name, slug, product, "createdAt", "updatedAt" FROM "Tenant" ORDER BY name',
    );
    return rows;
  }

  async findOne(id: string) {
    const { rows } = await this.pool.query(
      'SELECT id, name, slug, product, "createdAt", "updatedAt" FROM "Tenant" WHERE id = $1',
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Tenant não encontrado');
    return rows[0];
  }

  async update(id: string, dto: UpdateTenantDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name);
    }
    if (dto.product) {
      fields.push(`product = $${idx++}`);
      values.push(dto.product);
    }
    if (!fields.length) return this.findOne(id);

    fields.push(`"updatedAt" = NOW()`);
    values.push(id);

    const { rows } = await this.pool.query(
      `UPDATE "Tenant" SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, slug, product, "createdAt", "updatedAt"`,
      values,
    );
    if (!rows[0]) throw new NotFoundException('Tenant não encontrado');
    return rows[0];
  }
}
