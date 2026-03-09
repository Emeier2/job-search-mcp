import type { Preferences, JobDetails, ScoreResult } from "../types.js";
import { htmlToText } from "../utils/html-to-text.js";
import { PLATFORM_BONUS } from "../sources/registry.js";

/**
 * Cost-of-living multipliers applied to salary_min for in-person roles.
 * Baseline is 1.0 (SF/NYC). Remote jobs use 0.9 to account for geo-adjusted offers.
 * Multiplier is matched via substring against the job location string.
 */
const COL_MULTIPLIERS: Array<{ pattern: string; multiplier: number }> = [
  { pattern: "san francisco", multiplier: 1.0 },
  { pattern: "new york", multiplier: 1.0 },
  { pattern: "nyc", multiplier: 1.0 },
  { pattern: "seattle", multiplier: 0.95 },
  { pattern: "bellevue", multiplier: 0.95 },
  { pattern: "los angeles", multiplier: 0.95 },
  { pattern: "boston", multiplier: 0.95 },
  { pattern: "washington, dc", multiplier: 0.95 },
  { pattern: "austin", multiplier: 0.88 },
  { pattern: "denver", multiplier: 0.88 },
  { pattern: "portland", multiplier: 0.88 },
  { pattern: "chicago", multiplier: 0.88 },
  { pattern: "salt lake", multiplier: 0.85 },
  { pattern: "utah", multiplier: 0.85 },
  { pattern: "remote", multiplier: 0.9 },
];
const COL_DEFAULT_MULTIPLIER = 0.85;

/** Determine the COL multiplier for a job location string. */
function getColMultiplier(location: string | null): number {
  if (!location) return COL_DEFAULT_MULTIPLIER;
  const loc = location.toLowerCase();
  for (const { pattern, multiplier } of COL_MULTIPLIERS) {
    if (loc.includes(pattern)) return multiplier;
  }
  return COL_DEFAULT_MULTIPLIER;
}

/**
 * Score a job against user preferences.
 * Pure string matching and arithmetic — zero LLM calls.
 *
 * Scoring rules:
 * 1. Title keyword matches — sum matched weights
 * 2. Description keyword matches — sum matched weights
 * 3. Exclusion penalty — if any exclusion term in title → score = -1
 * 4. Location bonus — if job location matches a preferred location → +2
 * 5. Salary check — COL-adjusted: if salary below adjusted floor → score = -1
 */
export function scoreJob(job: JobDetails, prefs: Preferences, platform?: string): ScoreResult {
  const breakdown: Record<string, number> = {};
  const titleLower = job.title.toLowerCase();
  const descText = job.description_html ? htmlToText(job.description_html).toLowerCase() : "";

  // 3. Exclusion check (early exit)
  for (const exclusion of prefs.exclusions) {
    if (titleLower.includes(exclusion.toLowerCase())) {
      breakdown[`exclusion:${exclusion}`] = -1;
      return { score: -1, breakdown };
    }
  }

  // 5. Salary check — COL-adjusted (early exit)
  if (prefs.salary_min > 0 && job.salary_max !== null && job.salary_max > 0) {
    const colMultiplier = getColMultiplier(job.location);
    const adjustedFloor = Math.round(prefs.salary_min * colMultiplier);
    if (job.salary_max < adjustedFloor) {
      breakdown[`salary_below_min (floor:${adjustedFloor},col:${colMultiplier})`] = -1;
      return { score: -1, breakdown };
    }
  }

  let score = 0;

  // 1. Title keyword matches
  for (const kw of prefs.title_keywords) {
    if (titleLower.includes(kw.term.toLowerCase())) {
      breakdown[`title:${kw.term}`] = kw.weight;
      score += kw.weight;
    }
  }

  // 2. Description keyword matches
  for (const kw of prefs.description_keywords) {
    if (descText.includes(kw.term.toLowerCase())) {
      breakdown[`desc:${kw.term}`] = kw.weight;
      score += kw.weight;
    }
  }

  // 4. Location bonus
  if (job.location && prefs.locations.length > 0) {
    const locLower = job.location.toLowerCase();
    for (const prefLoc of prefs.locations) {
      if (locLower.includes(prefLoc.toLowerCase())) {
        breakdown[`location:${prefLoc}`] = 2;
        score += 2;
        break; // Only one location bonus
      }
    }
  }

  // 6. Platform bonus
  if (platform) {
    const bonus = PLATFORM_BONUS[platform.toLowerCase()] ?? 0;
    if (bonus > 0) {
      breakdown[`platform:${platform.toLowerCase()}`] = bonus;
      score += bonus;
    }
  }

  return { score, breakdown };
}
