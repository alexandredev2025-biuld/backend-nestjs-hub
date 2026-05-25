import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://transport_dev:dev_secret_123@localhost:5432/transport_core',
  });

  console.log('Adicionando colunas traccarDeviceId e traccarSyncStatus...');

  await pool.query(`
    ALTER TABLE "Vehicle"
      ADD COLUMN IF NOT EXISTS "traccarDeviceId" INTEGER,
      ADD COLUMN IF NOT EXISTS "traccarSyncStatus" TEXT NOT NULL DEFAULT 'PENDING';
  `);

  console.log('Migração concluída!');
  await pool.end();
}

main().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
