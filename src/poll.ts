/**
 * Background poller — standalone entry point, NOT an MCP server.
 * Run by the OS scheduler: node build/poll.js
 *
 * Flow:
 * 1. Load preferences.json
 * 2. For each company in preferences: fetch jobs via source dispatch
 * 3. For each job: run scoring engine → compute score
 * 4. Write/update SQLite (jobs table + FTS5 index + scores)
 * 5. Log summary to stderr and exit
 */

import { loadPreferences } from "./utils/preferences.js";
import { getSource } from "./sources/registry.js";
import { scoreJob } from "./scoring/scorer.js";
import { upsertJob, persistJobs, markJobsDead } from "./db/cache.js";
import { closeDb } from "./db/schema.js";

async function poll() {
  const prefs = loadPreferences();
  if (!prefs) {
    console.error("[poll] No preferences.json found. Run setup first.");
    process.exit(1);
  }

  console.error(`[poll] Starting poll for ${prefs.companies.length} companies...`);

  let totalJobs = 0;
  let totalMatches = 0;
  let totalErrors = 0;

  for (const company of prefs.companies) {
    const source = getSource(company.ats);
    if (!source) {
      console.error(`[poll] Unknown ATS platform: ${company.ats} for ${company.name}`);
      totalErrors++;
      continue;
    }

    console.error(`[poll] Fetching ${company.name} (${company.ats}/${company.slug})...`);

    const result = await source.fetchJobs(company.slug);
    if (!result.ok) {
      console.error(`[poll] Error fetching ${company.name}: ${result.error}`);
      totalErrors++;
      continue;
    }

    const jobs = result.data;
    const companyId = `${company.ats}:${company.slug}`;
    console.error(`[poll]   Found ${jobs.length} jobs`);
    totalJobs += jobs.length;

    // Mark jobs that are no longer in the API response as dead
    const liveIds = jobs.map((j) => j.external_id);
    await markJobsDead(companyId, liveIds, source.name);

    // Score and upsert each job
    let companyMatches = 0;
    for (const job of jobs) {
      const { score, breakdown } = scoreJob(job, prefs);
      await upsertJob(source.name, companyId, job, score, breakdown);
      if (score >= prefs.score_threshold) {
        companyMatches++;
      }
    }

    totalMatches += companyMatches;
    console.error(`[poll]   ${companyMatches} matches (score >= ${prefs.score_threshold})`);
  }

  // Persist all changes to disk
  await persistJobs();

  console.error(`[poll] Done. ${totalJobs} jobs processed, ${totalMatches} matches, ${totalErrors} errors.`);
  closeDb();
}

poll().catch((err) => {
  console.error("[poll] Fatal error:", err);
  process.exit(1);
});
