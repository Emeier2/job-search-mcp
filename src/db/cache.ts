import { getDb, persistDb } from "./schema.js";
import { htmlToText } from "../utils/html-to-text.js";
import type { CompanyMetadata, JobListing, JobDetails } from "../types.js";

// TTL in hours for different data types
const TTL_HOURS = {
  companies: 24 * 7, // 1 week
  jobs: 6,           // 6 hours (matches polling interval)
};

function isStale(updatedAt: string | null, type: keyof typeof TTL_HOURS): boolean {
  if (!updatedAt) return true;
  const age = Date.now() - new Date(updatedAt).getTime();
  return age > TTL_HOURS[type] * 60 * 60 * 1000;
}

// ─── Company Operations ───

export async function upsertCompany(company: CompanyMetadata): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO companies (id, name, ats_platform, ats_slug, description, mission_values,
       industry, funding_stage, headcount_range, culture_keywords, careers_url,
       board_content_html, open_role_count, departments, locations, discovered_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, description=excluded.description,
       mission_values=excluded.mission_values, open_role_count=excluded.open_role_count,
       departments=excluded.departments, locations=excluded.locations,
       board_content_html=excluded.board_content_html, updated_at=excluded.updated_at`,
    [
      company.id, company.name, company.ats_platform, company.ats_slug,
      company.description, company.mission_values,
      company.industry, company.funding_stage, company.headcount_range,
      company.culture_keywords ? JSON.stringify(company.culture_keywords) : null,
      company.careers_url, company.board_content_html,
      company.open_role_count,
      JSON.stringify(company.departments), JSON.stringify(company.locations),
      company.discovered_at || now, now,
    ]
  );
  persistDb();
}

export async function getCompany(id: string): Promise<CompanyMetadata | null> {
  const db = await getDb();
  const stmt = db.prepare("SELECT * FROM companies WHERE id = ?");
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const row = stmt.getAsObject();
  stmt.free();
  return rowToCompany(row);
}

export async function getAllCompanies(): Promise<CompanyMetadata[]> {
  const db = await getDb();
  const results: CompanyMetadata[] = [];
  const stmt = db.prepare("SELECT * FROM companies ORDER BY name");

  while (stmt.step()) {
    results.push(rowToCompany(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}

export async function isCompanyStale(id: string): Promise<boolean> {
  const company = await getCompany(id);
  if (!company) return true;
  return isStale(company.updated_at, "companies");
}

function rowToCompany(row: Record<string, unknown>): CompanyMetadata {
  return {
    id: row.id as string,
    name: row.name as string,
    ats_platform: row.ats_platform as CompanyMetadata["ats_platform"],
    ats_slug: row.ats_slug as string,
    description: (row.description as string) || null,
    mission_values: (row.mission_values as string) || null,
    industry: (row.industry as string) || null,
    funding_stage: (row.funding_stage as string) || null,
    headcount_range: (row.headcount_range as string) || null,
    culture_keywords: row.culture_keywords ? JSON.parse(row.culture_keywords as string) : null,
    careers_url: (row.careers_url as string) || "",
    board_content_html: (row.board_content_html as string) || null,
    open_role_count: (row.open_role_count as number) || 0,
    departments: row.departments ? JSON.parse(row.departments as string) : [],
    locations: row.locations ? JSON.parse(row.locations as string) : [],
    discovered_at: (row.discovered_at as string) || "",
    updated_at: (row.updated_at as string) || "",
  };
}

// ─── Job Operations ───

export async function upsertJob(
  source: string,
  companyId: string,
  job: JobDetails,
  score: number,
  scoreBreakdown: Record<string, number>
): Promise<void> {
  const db = await getDb();
  const id = `${source}:${companyId}:${job.external_id}`;
  const now = new Date().toISOString();
  const descText = job.description_html ? htmlToText(job.description_html) : null;

  // Upsert job
  db.run(
    `INSERT INTO jobs (id, source, company_id, external_id, title, location, department,
       salary_min, salary_max, salary_currency, description_html, description_text,
       application_url, date_posted, date_scraped, is_live, tags, score, score_breakdown)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title=excluded.title, location=excluded.location, department=excluded.department,
       salary_min=excluded.salary_min, salary_max=excluded.salary_max,
       description_html=excluded.description_html, description_text=excluded.description_text,
       application_url=excluded.application_url, date_scraped=excluded.date_scraped,
       is_live=1, tags=excluded.tags, score=excluded.score,
       score_breakdown=excluded.score_breakdown`,
    [
      id, source, companyId, job.external_id, job.title,
      job.location, job.department,
      job.salary_min, job.salary_max, job.salary_currency,
      job.description_html, descText,
      job.application_url, job.date_posted, now,
      JSON.stringify(job.tags), score, JSON.stringify(scoreBreakdown),
    ]
  );

}

export async function persistJobs(): Promise<void> {
  persistDb();
}

export async function getJob(source: string, company: string, jobId: string): Promise<JobListing | null> {
  const db = await getDb();
  const id = `${source}:${company}:${jobId}`;
  const stmt = db.prepare("SELECT * FROM jobs WHERE id = ?");
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const row = stmt.getAsObject();
  stmt.free();
  return rowToJob(row);
}

export async function getTopMatches(opts: {
  threshold: number;
  limit?: number;
  company?: string;
  location?: string;
  days?: number;
}): Promise<JobListing[]> {
  const db = await getDb();
  const conditions = ["is_live = 1", "score >= ?"];
  const params: unknown[] = [opts.threshold];

  if (opts.company) {
    conditions.push("company_id = ?");
    params.push(opts.company);
  }
  if (opts.location) {
    conditions.push("location LIKE ?");
    params.push(`%${opts.location}%`);
  }
  if (opts.days) {
    const cutoff = new Date(Date.now() - opts.days * 24 * 60 * 60 * 1000).toISOString();
    conditions.push("date_scraped >= ?");
    params.push(cutoff);
  }

  const limit = opts.limit || 25;
  const sql = `SELECT * FROM jobs WHERE ${conditions.join(" AND ")} ORDER BY score DESC, CASE source WHEN 'greenhouse' THEN 0 WHEN 'lever' THEN 1 WHEN 'ashby' THEN 2 ELSE 3 END ASC LIMIT ?`;
  params.push(limit);

  const results: JobListing[] = [];
  const stmt = db.prepare(sql);
  stmt.bind(params as (string | number | null)[]);

  while (stmt.step()) {
    results.push(rowToJob(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}

export async function getCompanyJobs(companyId: string): Promise<JobListing[]> {
  const db = await getDb();
  const results: JobListing[] = [];
  const stmt = db.prepare(
    "SELECT * FROM jobs WHERE company_id = ? AND is_live = 1 ORDER BY score DESC, CASE source WHEN 'greenhouse' THEN 0 WHEN 'lever' THEN 1 WHEN 'ashby' THEN 2 ELSE 3 END ASC"
  );
  stmt.bind([companyId]);

  while (stmt.step()) {
    results.push(rowToJob(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}

export async function markJobsDead(companyId: string, liveExternalIds: string[], source: string): Promise<void> {
  const db = await getDb();
  if (liveExternalIds.length === 0) {
    db.run("UPDATE jobs SET is_live = 0 WHERE company_id = ? AND source = ?", [companyId, source]);
  } else {
    const placeholders = liveExternalIds.map(() => "?").join(",");
    db.run(
      `UPDATE jobs SET is_live = 0 WHERE company_id = ? AND source = ? AND external_id NOT IN (${placeholders})`,
      [companyId, source, ...liveExternalIds]
    );
  }
}

export async function getJobsByDepartment(companyId: string, department: string): Promise<JobListing[]> {
  const db = await getDb();
  const results: JobListing[] = [];
  const stmt = db.prepare(
    "SELECT * FROM jobs WHERE company_id = ? AND department = ? AND is_live = 1 ORDER BY score DESC, CASE source WHEN 'greenhouse' THEN 0 WHEN 'lever' THEN 1 WHEN 'ashby' THEN 2 ELSE 3 END ASC"
  );
  stmt.bind([companyId, department]);

  while (stmt.step()) {
    results.push(rowToJob(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}

function rowToJob(row: Record<string, unknown>): JobListing {
  return {
    id: row.id as string,
    source: row.source as string,
    company_id: row.company_id as string,
    external_id: row.external_id as string,
    title: row.title as string,
    location: (row.location as string) || null,
    department: (row.department as string) || null,
    salary_min: row.salary_min as number | null,
    salary_max: row.salary_max as number | null,
    salary_currency: (row.salary_currency as string) || "USD",
    description_html: (row.description_html as string) || null,
    description_text: (row.description_text as string) || null,
    application_url: (row.application_url as string) || null,
    date_posted: (row.date_posted as string) || null,
    date_scraped: (row.date_scraped as string) || "",
    is_live: row.is_live === 1,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    score: (row.score as number) || 0,
    score_breakdown: row.score_breakdown ? JSON.parse(row.score_breakdown as string) : null,
  };
}
