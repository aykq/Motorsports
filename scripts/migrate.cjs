const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// PostgreSQL error codes that mean "object already exists" — safe to ignore
const ALREADY_EXISTS = new Set(["42P07", "42701", "42P11", "42P06"]);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL UNIQUE,
        created_at bigint
      )
    `);

    const { rows: applied } = await pool.query(
      'SELECT hash FROM "__drizzle_migrations"'
    );
    const appliedSet = new Set(applied.map((r) => r.hash));

    const migrationsDir = path.join(__dirname, "../drizzle");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const name = path.basename(file, ".sql");
      if (appliedSet.has(name)) {
        console.log(`  skip: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);

      let ok = true;
      for (const stmt of statements) {
        try {
          await pool.query(stmt);
        } catch (err) {
          if (ALREADY_EXISTS.has(err.code)) {
            console.log(`  [${err.code}] already exists, continuing`);
          } else {
            console.error(`  [${err.code}] unexpected error in ${file}:`, err.message);
            ok = false;
            break;
          }
        }
      }

      if (ok) {
        await pool.query(
          'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [name, Date.now()]
        );
        console.log(`  applied: ${file}`);
      }
    }

    console.log("Migrations complete");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
