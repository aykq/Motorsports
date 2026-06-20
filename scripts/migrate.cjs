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
    // Tracking table (compatible with drizzle-kit's format)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL UNIQUE,
        created_at bigint
      )
    `);

    const applied = await pool.query('SELECT hash FROM "__drizzle_migrations"');
    const appliedSet = new Set(applied.rows.map((r) => r.hash));

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
