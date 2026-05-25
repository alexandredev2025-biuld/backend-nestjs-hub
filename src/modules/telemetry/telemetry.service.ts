import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private redis: Redis;

  constructor() {
    this.redis = new Redis({ host: 'localhost', port: 6379, keyPrefix: 'telemetry:' });
  }

  async queuePositions(payload: any[]) {
    const streamKey = 'positions:ingest';
    const batchSize = 200;

    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const data = batch.map(p => ({
        tenant_id: 'default-tenant', // substituir por lookup por device_id em prod
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
        '100000', // retem ~100k mensagens (~55min a 30s)
        '*',
        JSON.stringify(data),
      );
    }

    this.logger.log(`Queued ${payload.length} positions`);
  }
}