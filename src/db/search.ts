import { getDb } from "./schema.js";
import type { JobListing } from "../types.js";

/**
 * Search across job titles, descriptions, company IDs, and tags.
 * Uses LIKE-based matching (sql.js WASM doesn't include FTS5).
 * At our scale (a few thousand jobs), this is plenty fast.
 */
export async function searchJobs(query: string, limit: number = 25): Promise<JobListing[]> {
  const db = await getDb();

  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return [];

  // Build WHERE clause: all words must appear in at least one searchable field
  const conditions = words.map(
    () =>
      `(title LIKE ? OR description_text LIKE ? OR company_id LIKE ? OR tags LIKE ?)`
  );
  const params: (string | number)[] = [];
  for (const word of words) {
    const pattern = `%${word}%`;
    params.push(pattern, pattern, pattern, pattern);
  }
  params.push(limit);

  const sql = `
    SELECT * FROM jobs
    WHERE is_live = 1 AND ${conditions.join(" AND ")}
    ORDER BY score DESC
    LIMIT ?
  `;

  const results: JobListing[] = [];
  const stmt = db.prepare(sql);
  stmt.bind(params as (string | number | null)[]);

  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
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
    });
  }
  stmt.free();
  return results;
}
