import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { Pool } from 'pg';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private redis: Redis;

  constructor(@Inject('PG_POOL') private readonly pool: Pool) {
    this.redis = new Redis({
      host: 'localhost',
      port: 6379,
      keyPrefix: 'telemetry:',
    });
  }

  async queuePositions(payload: any[]) {
    const streamKey = 'positions:ingest';
    const batchSize = 200;

    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const data = batch.map((p) => ({
        tenant_id: 'default-tenant',
        device_id: String(p.device_id || p.deviceId),
        ts: new Date(p.fixtime || p.timestamp).toISOString(),
        lat: Number(p.latitude),
        lng: Number(p.longitude),
        ignition: p.ignition === 'true' || p.ignition === true,
        speed: p.speed ? Number(p.speed) : null,
      }));

      await this.redis.xadd(
        streamKey,
        'MAXLEN',
        '~',
        '100000',
        '*',
        'data',
        JSON.stringify(data),
      );
    }

    this.logger.log(`Queued ${payload.length} positions`);
  }

  async storeEvents(events: any[]) {
    if (!events.length) return;

    const valid = events.filter((e) => e.deviceId || e.device_id);
    if (!valid.length) return;

    const query = `
      INSERT INTO events (tenant_id, device_id, type, position_id, geofence_id, attributes, server_time)
      SELECT unnest($1::uuid[]), unnest($2::text[]), unnest($3::text[]),
             unnest($4::int[]), unnest($5::int[]), unnest($6::jsonb[]), unnest($7::timestamptz[])
    `;

    const tenantId = '00000000-0000-0000-0000-000000000000';

    await this.pool.query(query, [
      valid.map(() => tenantId),
      valid.map((e) => String(e.deviceId || e.device_id)),
      valid.map((e) => e.type || 'unknown'),
      valid.map((e) => e.positionId || e.position_id || null),
      valid.map((e) => e.geofenceId || e.geofence_id || null),
      valid.map((e) => JSON.stringify(e.attributes || {})),
      valid.map((e) => new Date(e.serverTime || e.server_time || new Date()).toISOString()),
    ]);

    this.logger.log(`Stored ${valid.length} events (${events.length - valid.length} skipped)`);
  }
}
