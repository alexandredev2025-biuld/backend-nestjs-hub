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

    const query = `
      INSERT INTO events (tenant_id, device_id, type, position_id, geofence_id, attributes, server_time)
      SELECT unnest($1::uuid[]), unnest($2::text[]), unnest($3::text[]),
             unnest($4::int[]), unnest($5::int[]), unnest($6::jsonb[]), unnest($7::timestamptz[])
    `;

    const tenantId = '00000000-0000-0000-0000-000000000000';

    await this.pool.query(query, [
      events.map(() => tenantId),
      events.map((e) => String(e.deviceId || e.device_id)),
      events.map((e) => e.type),
      events.map((e) => e.positionId || e.position_id || null),
      events.map((e) => e.geofenceId || e.geofence_id || null),
      events.map((e) => JSON.stringify(e.attributes || {})),
      events.map((e) => (e.serverTime || new Date().toISOString())),
    ]);

    this.logger.log(`Stored ${events.length} events`);
  }
}
