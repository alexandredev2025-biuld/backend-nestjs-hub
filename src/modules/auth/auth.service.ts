import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  tenantId: string;
  product: string;
}

interface TenantRow {
  id: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject('PG_POOL') private readonly pool: Pool,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.pool.query<UserRow>(
      'SELECT id FROM "User" WHERE email = $1',
      [dto.email],
    );

    if (existing.rows[0]) {
      throw new ConflictException('Email already registered');
    }

    const slugExists = await this.pool.query<TenantRow>(
      'SELECT id FROM "Tenant" WHERE slug = $1',
      [dto.tenantSlug],
    );

    if (slugExists.rows[0]) {
      throw new ConflictException('Tenant slug already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const { rows: tenantRows } = await client.query<TenantRow>(
        `INSERT INTO "Tenant" (name, slug, product)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [dto.tenantName, dto.tenantSlug, dto.product],
      );

      const tenantId = tenantRows[0].id;

      const { rows: userRows } = await client.query<UserRow>(
        `INSERT INTO "User" (email, password, name, role, "tenantId")
         VALUES ($1, $2, $3, 'MASTER', $4)
         RETURNING id, email, name, role, "tenantId"`,
        [dto.email, hashedPassword, dto.name, tenantId],
      );

      await client.query('COMMIT');

      const user = userRows[0];
      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      });

      return {
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          product: dto.product,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT u.id, u.email, u.password, u.name, u.role, u."tenantId", t.product
       FROM "User" u
       JOIN "Tenant" t ON t.id = u."tenantId"
       WHERE u.email = $1`,
      [dto.email],
    );

    if (!rows[0]) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = rows[0];
    const passwordValid = await bcrypt.compare(dto.password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        product: user.product,
      },
    };
  }
}
