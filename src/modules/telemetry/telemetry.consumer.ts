import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { Pool } from 'pg';

@Injectable()
export class TelemetryConsumer implements OnModuleInit {
  private readonly logger = new Logger(TelemetryConsumer.name);
  private redis: Redis;
  private pg: Pool;
  private readonly streamKey = 'positions:ingest';
  private readonly group = 'telemetry-workers';
  private readonly consumer = `worker-${process.pid}`;

  constructor() {
    this.redis = new Redis({ host: 'localhost', port: 6379, keyPrefix: 'telemetry:' });
  }

  async onModuleInit() {
    // Injeta o pool via ConfigService ou cria direto (simplificado para dev)
    this.pg = new Pool({ connectionString: 'postgresql://transport_dev:dev_secret_123@localhost:5432/transport_core' });
    await this.ensureStreamGroup();
    this.startPolling();
  }

  private async ensureStreamGroup() {
    try {
      await this.redis.xgroup('CREATE', this.streamKey, this.group, '0', 'MKSTREAM');
    } catch {
      // Grupo já existe
    }
  }

  private startPolling() {
    const poll = async () => {
      try {
        const result = await this.redis.xreadgroup(
          'GROUP', this.group, this.consumer,
          'COUNT', 500, 'BLOCK', 2000,
          'STREAMS', this.streamKey, '>',
        );
  
        // Tipagem explícita do retorno do Redis
        if (!result || result.length === 0) return poll();
  
        const [streamName, messages] = result[0] as [string, [string, Record<string, string>][]];
  
        if (!messages || messages.length === 0) return poll();
  
        for (const [id, data] of messages) {
          try {
            const batch = JSON.parse(data.data as string);
            await this.insertBatch(batch);
            await this.redis.xack(this.streamKey, this.group, id);
          } catch (err) {
            this.logger.error(`Erro ao processar stream ${id}: ${err.message}`);
          }
        }
      } catch (err) {
        this.logger.error(`Erro no Redis stream: ${err.message}`);
      }
  
      setTimeout(poll, 50);
    };
  
    poll();
  }

  private async insertBatch(positions: any[]) {
    if (!positions.length) return;

    const query = `
      INSERT INTO positions (tenant_id, device_id, ts, geom, speed, ignition)
      SELECT 
        unnest($1::uuid[]), unnest($2::text[]), unnest($3::timestamptz[]),
        ST_SetSRID(ST_MakePoint(unnest($4::float[]), unnest($5::float[])), 4326),
        unnest($6::float[]), unnest($7::boolean[])
      ON CONFLICT (tenant_id, device_id, ts) DO NOTHING
    `;

    await this.pg.query(query, [
      positions.map(() => '00000000-0000-0000-0000-000000000000'), // tenant padrão
      positions.map(p => p.device_id),
      positions.map(p => p.ts),
      positions.map(p => p.lng),
      positions.map(p => p.lat),
      positions.map(p => p.speed),
      positions.map(p => p.ignition),
    ]);
  }
}