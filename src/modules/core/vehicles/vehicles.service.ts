import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(tenantId: string) {
    const { rows } = await this.pool.query(
      'SELECT id, plate, model, status, "tenantId", "createdAt", "updatedAt" FROM "Vehicle" WHERE "tenantId" = $1 ORDER BY plate',
      [tenantId],
    );
    return rows;
  }

  async findOne(tenantId: string, id: string) {
    const { rows } = await this.pool.query(
      'SELECT id, plate, model, status, "tenantId", "createdAt", "updatedAt" FROM "Vehicle" WHERE id = $1 AND "tenantId" = $2',
      [id, tenantId],
    );
    if (!rows[0]) throw new NotFoundException('Veículo não encontrado');
    return rows[0];
  }

  async create(tenantId: string, dto: CreateVehicleDto) {
    const existing = await this.pool.query(
      'SELECT id FROM "Vehicle" WHERE plate = $1',
      [dto.plate],
    );
    if (existing.rows[0]) throw new ConflictException('Placa já cadastrada');

    const { rows } = await this.pool.query(
      `INSERT INTO "Vehicle" (plate, model, status, "tenantId")
       VALUES ($1, $2, $3, $4)
       RETURNING id, plate, model, status, "tenantId", "createdAt", "updatedAt"`,
      [dto.plate, dto.model || null, dto.status || 'AVAILABLE', tenantId],
    );
    return rows[0];
  }

  async update(tenantId: string, id: string, dto: UpdateVehicleDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.plate) { fields.push(`plate = $${idx++}`); values.push(dto.plate); }
    if (dto.model !== undefined) { fields.push(`model = $${idx++}`); values.push(dto.model); }
    if (dto.status) { fields.push(`status = $${idx++}`); values.push(dto.status); }
    if (!fields.length) return this.findOne(tenantId, id);

    fields.push(`"updatedAt" = NOW()`);
    values.push(id, tenantId);

    const { rows } = await this.pool.query(
      `UPDATE "Vehicle" SET ${fields.join(', ')} WHERE id = $${idx++} AND "tenantId" = $${idx} RETURNING id, plate, model, status, "tenantId", "createdAt", "updatedAt"`,
      values,
    );
    if (!rows[0]) throw new NotFoundException('Veículo não encontrado');
    return rows[0];
  }

  async remove(tenantId: string, id: string) {
    const { rowCount } = await this.pool.query(
      'DELETE FROM "Vehicle" WHERE id = $1 AND "tenantId" = $2',
      [id, tenantId],
    );
    if (!rowCount) throw new NotFoundException('Veículo não encontrado');
  }
}
