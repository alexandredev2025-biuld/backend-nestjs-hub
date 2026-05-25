import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TraccarService implements OnModuleInit {
  private readonly logger = new Logger(TraccarService.name);
  private baseUrl: string;
  private cookie = '';

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get('TRACCAR_API_URL', 'http://localhost:8082/api');
  }

  async onModuleInit() {
    await this.authenticate();
  }

  private async authenticate() {
    const user = this.config.get('TRACCAR_USER', 'admin@genesisits.com.br');
    const pass = this.config.get('TRACCAR_PASSWORD', 'genesis2026');

    try {
      const res = await fetch(`${this.baseUrl}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({ email: user, password: pass }).toString(),
      });

      if (res.ok) {
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) {
          this.cookie = setCookie.split(';')[0];
          this.logger.log('Autenticado no Traccar API');
        }
      } else {
        this.logger.error(`Falha na autenticação Traccar: ${res.status}`);
      }
    } catch (err) {
      this.logger.error(`Falha ao autenticar no Traccar: ${err.message}`);
    }
  }

  private async request(path: string, options?: RequestInit) {
    if (!this.cookie) await this.authenticate();

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Cookie: this.cookie,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (res.status === 401) {
      await this.authenticate();
      return this.request(path, options);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Traccar ${path} respondeu ${res.status}: ${text.slice(0, 200)}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }

    return null;
  }

  getSessionCookie(): string {
    return this.cookie;
  }

  async getDevices() {
    return this.request('/devices');
  }

  async getDevice(id: number) {
    const devices = await this.request(`/devices?id=${id}`);
    return devices[0] || null;
  }

  async getPositions(deviceIds?: number[]) {
    const query = deviceIds?.length ? `?deviceId=${deviceIds.join('&deviceId=')}` : '';
    return this.request(`/positions${query}`);
  }

  async getPosition(id: number) {
    const positions = await this.request(`/positions?id=${id}`);
    return positions[0] || null;
  }

  async getEvents(deviceId?: number, from?: string, to?: string) {
    const params = new URLSearchParams();
    if (deviceId) params.append('deviceId', String(deviceId));
    params.append('from', from || '2026-01-01T00:00:00Z');
    params.append('to', to || new Date().toISOString());
    return this.request(`/reports/events?${params.toString()}`);
  }

  async createDevice(name: string, uniqueId: string): Promise<any> {
    return this.request('/devices', {
      method: 'POST',
      body: JSON.stringify({ name, uniqueId }),
    });
  }
}
