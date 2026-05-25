import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

type JwtPayload = {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  product: string;
};

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  product: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject('PG_POOL') private readonly pool: Pool,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT u.id, u.email, u.name, u.role, u."tenantId", t.product
       FROM "User" u
       JOIN "Tenant" t ON t.id = u."tenantId"
       WHERE u.id = $1`,
      [payload.sub],
    );

    if (!rows[0]) {
      throw new UnauthorizedException();
    }

    return rows[0];
  }
}
