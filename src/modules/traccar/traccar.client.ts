import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { TraccarGateway } from './traccar.gateway';
import { TraccarService } from './traccar.service';

@Injectable()
export class TraccarSocketClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TraccarSocketClient.name);
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private baseUrl: string;

  constructor(
    private config: ConfigService,
    private gateway: TraccarGateway,
    private traccarService: TraccarService,
  ) {
    const host = 'localhost';
    const port = this.config.get('TRACCAR_PORT', '8082');
    this.baseUrl = `ws://${host}:${port}/api/socket`;
  }

  async onModuleInit() {
    setTimeout(() => this.connect(), 3000);
  }

  onModuleDestroy() {
    this.disconnect();
  }

  private connect() {
    if (this.ws) return;

    const cookie = this.traccarService.getSessionCookie();
    if (!cookie) {
      this.logger.warn('Cookie Traccar não disponível, tentando novamente em 3s');
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      return;
    }

    try {
      this.ws = new WebSocket(this.baseUrl, {
        headers: { Cookie: cookie },
      });

      this.ws.on('open', () => {
        this.logger.log('Conectado ao WebSocket do Traccar');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });

      this.ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());

          if (parsed.positions) {
            for (const pos of parsed.positions) {
              this.gateway.broadcastPosition(pos);
            }
          }

          if (parsed.events) {
            for (const evt of parsed.events) {
              this.gateway.broadcastEvent(evt);
            }
          }

          if (parsed.devices) {
            for (const dev of parsed.devices) {
              this.gateway.broadcastDeviceStatus(dev);
            }
          }
        } catch {
          // mensagens não-JSON (ex: heartbeat) ignoradas
        }
      });

      this.ws.on('close', () => {
        this.logger.warn('WebSocket Traccar desconectado, reconectando em 5s...');
        this.ws = null;
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      });

      this.ws.on('error', (err) => {
        this.logger.error(`Erro no WebSocket Traccar: ${err.message}`);
      });
    } catch (err) {
      this.logger.error(`Falha ao conectar no Traccar WS: ${err.message}`);
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    }
  }

  private disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }
}
