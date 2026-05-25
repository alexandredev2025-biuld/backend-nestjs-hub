import { Injectable, Inject, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { TraccarService } from '../../traccar/traccar.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @Inject('PG_POOL') private readonly pool: Pool,
    private readonly traccar: TraccarService,
  ) {}

  async findAll(tenantId: string) {
    const { rows } = await this.pool.query(
      `SELECT id, plate, model, status, "traccarDeviceId", "traccarSyncStatus", "tenantId", "createdAt", "updatedAt"
       FROM "Vehicle" WHERE "tenantId" = $1 ORDER BY plate`,
      [tenantId],
    );
    return rows;
  }

  async findOne(tenantId: string, id: string) {
    const { rows } = await this.pool.query(
      `SELECT id, plate, model, status, "traccarDeviceId", "traccarSyncStatus", "tenantId", "createdAt", "updatedAt"
       FROM "Vehicle" WHERE id = $1 AND "tenantId" = $2`,
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
      `INSERT INTO "Vehicle" (plate, model, status, "tenantId", "traccarSyncStatus")
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id, plate, model, status, "traccarDeviceId", "traccarSyncStatus", "tenantId", "createdAt", "updatedAt"`,
      [dto.plate, dto.model || null, dto.status || 'AVAILABLE', tenantId],
    );

    const vehicle = rows[0];

    try {
      const traccarDevice = await this.traccar.createDevice(
        dto.plate,
        dto.plate,
      );
      await this.pool.query(
        `UPDATE "Vehicle" SET "traccarDeviceId" = $1, "traccarSyncStatus" = 'SYNCED', "updatedAt" = NOW()
         WHERE id = $2`,
        [traccarDevice.id, vehicle.id],
      );
      vehicle.traccarDeviceId = traccarDevice.id;
      vehicle.traccarSyncStatus = 'SYNCED';
      this.logger.log(`Veículo ${dto.plate} sincronizado com Traccar (deviceId=${traccarDevice.id})`);
    } catch (err) {
      this.logger.warn(`Falha ao sincronizar veículo ${dto.plate} com Traccar: ${err.message}`);
    }

    return vehicle;
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
      `UPDATE "Vehicle" SET ${fields.join(', ')} WHERE id = $${idx++} AND "tenantId" = $${idx}
       RETURNING id, plate, model, status, "traccarDeviceId", "traccarSyncStatus", "tenantId", "createdAt", "updatedAt"`,
      values,
    );
    if (!rows[0]) throw new NotFoundException('Veículo não encontrado');
    return rows[0];
  }

  async remove(tenantId: string, id: string) {
    const { rows } = await this.pool.query(
      'SELECT "traccarDeviceId" FROM "Vehicle" WHERE id = $1 AND "tenantId" = $2',
      [id, tenantId],
    );
    if (!rows[0]) throw new NotFoundException('Veículo não encontrado');

    await this.pool.query(
      'DELETE FROM "Vehicle" WHERE id = $1 AND "tenantId" = $2',
      [id, tenantId],
    );
  }

  async syncToTraccar(id: string, tenantId: string) {
    const vehicle = await this.findOne(tenantId, id);
    if (vehicle.traccarSyncStatus === 'SYNCED') {
      return vehicle;
    }

    try {
      const traccarDevice = await this.traccar.createDevice(
        vehicle.plate,
        vehicle.plate,
      );
      await this.pool.query(
        `UPDATE "Vehicle" SET "traccarDeviceId" = $1, "traccarSyncStatus" = 'SYNCED', "updatedAt" = NOW()
         WHERE id = $2`,
        [traccarDevice.id, id],
      );
      vehicle.traccarDeviceId = traccarDevice.id;
      vehicle.traccarSyncStatus = 'SYNCED';
      this.logger.log(`Veículo ${vehicle.plate} sincronizado com Traccar (deviceId=${traccarDevice.id})`);
    } catch (err) {
      this.logger.warn(`Falha ao sincronizar veículo ${vehicle.plate} com Traccar: ${err.message}`);
      throw err;
    }

    return vehicle;
  }

  async syncAllPending(tenantId: string) {
    const { rows: pendentes } = await this.pool.query(
      `SELECT id, plate FROM "Vehicle"
       WHERE "tenantId" = $1 AND ("traccarSyncStatus" IS NULL OR "traccarSyncStatus" != 'SYNCED')`,
      [tenantId],
    );

    const results: { id: string; plate: string; success: boolean; error?: string }[] = [];

    for (const v of pendentes) {
      try {
        const traccarDevice = await this.traccar.createDevice(v.plate, v.plate);
        await this.pool.query(
          `UPDATE "Vehicle" SET "traccarDeviceId" = $1, "traccarSyncStatus" = 'SYNCED', "updatedAt" = NOW()
           WHERE id = $2`,
          [traccarDevice.id, v.id],
        );
        results.push({ id: v.id, plate: v.plate, success: true });
        this.logger.log(`Veículo ${v.plate} sincronizado com Traccar (deviceId=${traccarDevice.id})`);
      } catch (err) {
        await this.pool.query(
          `UPDATE "Vehicle" SET "traccarSyncStatus" = 'FAILED', "updatedAt" = NOW()
           WHERE id = $1`,
          [v.id],
        );
        results.push({ id: v.id, plate: v.plate, success: false, error: err.message });
        this.logger.warn(`Falha ao sincronizar veículo ${v.plate}: ${err.message}`);
      }
    }

    return { synced: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length, details: results };
  }
}
