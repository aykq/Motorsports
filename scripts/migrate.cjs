const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Create migration tracking table
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

    // If tracking table is empty, check if DB was bootstrapped via db:push.
    // If so, mark all existing migrations as already applied to avoid
    // re-running CREATE TABLE statements on tables that already exist.
    if (appliedSet.size === 0) {
      const { rows } = await pool.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'cached_races'
        LIMIT 1
      `);
      if (rows.length > 0) {
        console.log(
          "Existing installation detected — marking all migrations as applied"
        );
        for (const file of files) {
          const name = path.basename(file, ".sql");
          await pool.query(
            'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [name, Date.now()]
          );
          console.log(`  marked: ${file}`);
        }
        console.log("Migrations complete (bootstrapped)");
        return;
      }
    }

    // Normal path: apply only pending migrations
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

      for (const stmt of statements) {
        await pool.query(stmt);
      }

      await pool.query(
        'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
        [name, Date.now()]
      );
      console.log(`  applied: ${file}`);
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
