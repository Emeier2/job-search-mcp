import initSqlJs, { type Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "data");
const DB_PATH = join(DATA_DIR, "cache.db");

let db: Database | null = null;

/**
 * Get or initialize the SQLite database.
 * sql.js loads the entire DB into memory; we persist on write.
 */
export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    mkdirSync(DATA_DIR, { recursive: true });
    db = new SQL.Database();
  }

  createTables(db);
  return db;
}

/**
 * Persist the in-memory database to disk.
 * Must be called after any write operations.
 */
export function persistDb(): void {
  if (!db) return;
  mkdirSync(DATA_DIR, { recursive: true });
  const data = db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * Close the database and flush to disk.
 */
export function closeDb(): void {
  if (!db) return;
  persistDb();
  db.close();
  db = null;
}

function createTables(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ats_platform TEXT NOT NULL,
      ats_slug TEXT NOT NULL,
      description TEXT,
      mission_values TEXT,
      industry TEXT,
      funding_stage TEXT,
      headcount_range TEXT,
      culture_keywords TEXT,
      careers_url TEXT,
      board_content_html TEXT,
      open_role_count INTEGER DEFAULT 0,
      departments TEXT,
      locations TEXT,
      discovered_at TEXT,
      updated_at TEXT
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      company_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT,
      department TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      salary_currency TEXT DEFAULT 'USD',
      description_html TEXT,
      description_text TEXT,
      application_url TEXT,
      date_posted TEXT,
      date_scraped TEXT,
      is_live BOOLEAN DEFAULT 1,
      tags TEXT,
      score REAL DEFAULT 0,
      score_breakdown TEXT,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  // Indexes
  database.run(`CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score DESC)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(date_scraped)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_jobs_live ON jobs(is_live)`);
}
