import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

async function main() {
  const pool = new Pool({
    connectionString:
      'postgresql://transport_dev:dev_secret_123@localhost:5432/transport_core',
  });

  console.log('Criando tabelas...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "Tenant" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      product TEXT NOT NULL DEFAULT 'OTIMIBUS',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "User" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'VIEWER',
      "tenantId" UUID NOT NULL REFERENCES "Tenant"(id),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "Vehicle" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plate TEXT NOT NULL UNIQUE,
      model TEXT,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      "tenantId" UUID NOT NULL REFERENCES "Tenant"(id),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS positions (
      id BIGSERIAL,
      tenant_id UUID NOT NULL,
      device_id TEXT NOT NULL,
      ts TIMESTAMPTZ NOT NULL,
      geom GEOMETRY(Point, 4326),
      speed FLOAT,
      ignition BOOLEAN,
      PRIMARY KEY (tenant_id, device_id, ts)
    );
  `);

  console.log('Limpando dados existentes...');
  await pool.query('DELETE FROM positions');
  await pool.query('DELETE FROM "Vehicle"');
  await pool.query('DELETE FROM "User"');
  await pool.query('DELETE FROM "Tenant"');

  const hash = (pw: string) => bcrypt.hashSync(pw, 12);

  const { rows: tenants } = await pool.query(`
    INSERT INTO "Tenant" (name, slug, product) VALUES
      ('Transportadora ABC', 'transportadora-abc', 'OTIMIBUS'),
      ('Logística XYZ Ltda', 'logistica-xyz', 'FAST_TRACKING')
    RETURNING id, slug, product
  `);

  const [tenantOtimiBus, tenantFastTrack] = [
    tenants.find((t) => t.product === 'OTIMIBUS')!,
    tenants.find((t) => t.product === 'FAST_TRACKING')!,
  ];

  console.log(`Tenants: ${tenants.map((t) => t.slug).join(', ')}`);

  const users = [
    { email: 'master@otimibus.com', name: 'Admin Master OtimiBus', role: 'MASTER', tenant: tenantOtimiBus },
    { email: 'admin@otimibus.com', name: 'Admin OtimiBus', role: 'ADMIN', tenant: tenantOtimiBus },
    { email: 'operator@otimibus.com', name: 'Operador OtimiBus', role: 'OPERATOR', tenant: tenantOtimiBus },
    { email: 'viewer@otimibus.com', name: 'Visualizador OtimiBus', role: 'VIEWER', tenant: tenantOtimiBus },
    { email: 'master@fasttracking.com', name: 'Admin Master FastTracking', role: 'MASTER', tenant: tenantFastTrack },
    { email: 'admin@fasttracking.com', name: 'Admin FastTracking', role: 'ADMIN', tenant: tenantFastTrack },
    { email: 'operator@fasttracking.com', name: 'Operador FastTracking', role: 'OPERATOR', tenant: tenantFastTrack },
    { email: 'viewer@fasttracking.com', name: 'Visualizador FastTracking', role: 'VIEWER', tenant: tenantFastTrack },
  ];

  for (const u of users) {
    await pool.query(
      `INSERT INTO "User" (email, password, name, role, "tenantId") VALUES ($1, $2, $3, $4, $5)`,
      [u.email, hash('123456'), u.name, u.role, u.tenant.id],
    );
  }

  console.log(`Usuários: ${users.length} criados`);

  const vehicles = [
    { plate: 'ABC-1A23', model: 'Marcopolo Paradiso', tenant: tenantOtimiBus },
    { plate: 'DEF-4B56', model: 'Marcopolo Paradiso', tenant: tenantOtimiBus },
    { plate: 'GHI-7C89', model: 'Mercedes-Benz O500', tenant: tenantOtimiBus },
    { plate: 'JKL-0D12', model: 'Fiat Ducato', tenant: tenantFastTrack },
    { plate: 'MNO-3E45', model: 'Ford Transit', tenant: tenantFastTrack },
  ];

  for (const v of vehicles) {
    await pool.query(
      `INSERT INTO "Vehicle" (plate, model, status, "tenantId") VALUES ($1, $2, 'AVAILABLE', $3)`,
      [v.plate, v.model, v.tenant.id],
    );
  }

  console.log(`Veículos: ${vehicles.length} criados`);

  await pool.end();

  console.log('\n✅ Seed concluído!');
  console.log('\n🔑 Credenciais de teste (senha: 123456):');
  console.log('─────────────────────────────────────────────────────────');
  console.log('  Produto      | Role       | Email');
  console.log('  ─────────────┼────────────┼─────────────────────────────');
  for (const u of users) {
    const label = u.tenant.product === 'OTIMIBUS' ? 'OtimiBus    ' : 'FastTracking';
    console.log(`  ${label} | ${u.role.padEnd(10)} | ${u.email}`);
  }
  console.log('─────────────────────────────────────────────────────────');
}

main().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
