/**
 * Cost-of-living lookup utilities built on BEA RPP data.
 *
 * Multiplier formula: multiplier = rpp / RPP_BASELINE
 *   - NYC → 122.3/122.3 = 1.0 (baseline)
 *   - SF  → 118.5/122.3 = 0.969
 *   - SLC → 101.2/122.3 = 0.828
 *
 * The scorer uses these multipliers to adjust the user's salary floor
 * downward for lower-cost locations.
 */

import {
  RPP_ENTRIES,
  RPP_BASELINE,
  RPP_DATA_YEAR,
  RPP_NATIONAL_AVERAGE,
  REMOTE_MULTIPLIER,
  DEFAULT_MULTIPLIER,
  type RppEntry,
} from "./rpp-data.js";

export { RPP_DATA_YEAR, RPP_NATIONAL_AVERAGE };

/** Result of looking up a location's COL data. */
export interface ColLookupResult {
  found: boolean;
  msa: string | null;
  rpp: number | null;
  multiplier: number;
  isRemote: boolean;
}

/** Result of comparing two locations. */
export interface ColComparisonResult {
  city1: { name: string; msa: string | null; rpp: number | null; multiplier: number };
  city2: { name: string; msa: string | null; rpp: number | null; multiplier: number };
  /** Positive means city2 is more expensive */
  relativeDifference: number;
  salaryEquivalent: (salaryInCity1: number) => number;
}

/**
 * Look up COL data for a location string.
 * Substring matching (case-insensitive) against RPP entry patterns.
 */
export function lookupCol(location: string | null): ColLookupResult {
  if (!location) {
    return { found: false, msa: null, rpp: null, multiplier: DEFAULT_MULTIPLIER, isRemote: false };
  }

  const loc = location.toLowerCase();

  // Check for remote first
  if (loc.includes("remote")) {
    return { found: true, msa: null, rpp: null, multiplier: REMOTE_MULTIPLIER, isRemote: true };
  }

  // Substring match against all RPP entries
  for (const entry of RPP_ENTRIES) {
    for (const pattern of entry.patterns) {
      if (loc.includes(pattern)) {
        return {
          found: true,
          msa: entry.msa,
          rpp: entry.rpp,
          multiplier: rppToMultiplier(entry.rpp),
          isRemote: false,
        };
      }
    }
  }

  return { found: false, msa: null, rpp: null, multiplier: DEFAULT_MULTIPLIER, isRemote: false };
}

/**
 * Drop-in replacement for the old getColMultiplier() in scorer.ts.
 */
export function getColMultiplier(location: string | null): number {
  return lookupCol(location).multiplier;
}

/**
 * Compare cost of living between two locations.
 */
export function compareCol(location1: string, location2: string): ColComparisonResult {
  const col1 = lookupCol(location1);
  const col2 = lookupCol(location2);

  const rpp1 = col1.rpp ?? RPP_NATIONAL_AVERAGE;
  const rpp2 = col2.rpp ?? RPP_NATIONAL_AVERAGE;

  const relativeDifference = ((rpp2 - rpp1) / rpp1) * 100;

  return {
    city1: { name: location1, msa: col1.msa, rpp: col1.rpp, multiplier: col1.multiplier },
    city2: { name: location2, msa: col2.msa, rpp: col2.rpp, multiplier: col2.multiplier },
    relativeDifference,
    salaryEquivalent: (salaryInCity1: number) => Math.round(salaryInCity1 * (rpp2 / rpp1)),
  };
}

/**
 * "What does $X in city1 equal in city2?"
 */
export function salaryEquivalent(salary: number, fromLocation: string, toLocation: string): number {
  const from = lookupCol(fromLocation);
  const to = lookupCol(toLocation);
  const fromRpp = from.rpp ?? RPP_NATIONAL_AVERAGE;
  const toRpp = to.rpp ?? RPP_NATIONAL_AVERAGE;
  return Math.round(salary * (toRpp / fromRpp));
}

/**
 * Format COL context for display in job details.
 * Returns a markdown string.
 */
export function formatColContext(
  location: string | null,
  salaryMin: number | null,
  salaryMax: number | null,
  userSalaryFloor: number
): string {
  const col = lookupCol(location);

  if (col.isRemote) {
    return `**COL Index:** Remote (national-average pricing assumed)\n**Scorer Multiplier:** ${col.multiplier}\n**Adjusted Salary Floor:** $${Math.round(userSalaryFloor * col.multiplier).toLocaleString()}`;
  }

  if (!col.found) {
    return `**COL Index:** Unknown location (using default multiplier)\n**Scorer Multiplier:** ${col.multiplier}\n**Adjusted Salary Floor:** $${Math.round(userSalaryFloor * col.multiplier).toLocaleString()}`;
  }

  const lines: string[] = [];
  lines.push(`**COL Index:** ${col.rpp} RPP (national avg = 100) — ${col.msa}`);
  lines.push(`**Scorer Multiplier:** ${col.multiplier.toFixed(3)}`);
  lines.push(`**Adjusted Salary Floor:** $${Math.round(userSalaryFloor * col.multiplier).toLocaleString()}`);

  // If salary data is available, show purchasing power context
  if (salaryMax !== null && salaryMax > 0 && col.rpp !== null) {
    const sfEquiv = Math.round(salaryMax * (118.5 / col.rpp));
    const nycEquiv = Math.round(salaryMax * (122.3 / col.rpp));
    const nationalEquiv = Math.round(salaryMax * (RPP_NATIONAL_AVERAGE / col.rpp));

    if (col.rpp < 115) {
      lines.push(`**Purchasing Power:** $${salaryMax.toLocaleString()} here = $${sfEquiv.toLocaleString()} in SF, $${nycEquiv.toLocaleString()} in NYC`);
    } else if (col.rpp > 105) {
      lines.push(`**Purchasing Power:** $${salaryMax.toLocaleString()} here = $${nationalEquiv.toLocaleString()} at national average`);
    }
  }

  lines.push(`\n_Source: BEA Regional Price Parities, ${RPP_DATA_YEAR} data_`);
  return lines.join("\n");
}

/**
 * Compact COL annotation for match listings.
 * Returns e.g. " (RPP 101, ~$155K SF-equiv)" or "".
 */
export function getColAnnotation(location: string | null, salaryMax: number | null): string {
  const col = lookupCol(location);

  if (col.isRemote || !col.found || col.rpp === null) return "";

  let annotation = ` (RPP ${col.rpp})`;

  if (salaryMax !== null && salaryMax > 0 && col.rpp < 115) {
    const sfEquiv = Math.round(salaryMax * (118.5 / col.rpp));
    const sfEquivK = Math.round(sfEquiv / 1000);
    annotation = ` (RPP ${col.rpp}, ~$${sfEquivK}K SF-equiv)`;
  }

  return annotation;
}

/**
 * Search metros matching a query string.
 */
export function searchMetros(query: string): RppEntry[] {
  const q = query.toLowerCase();
  return RPP_ENTRIES.filter(
    (entry) =>
      entry.msa.toLowerCase().includes(q) ||
      entry.patterns.some((p) => p.includes(q))
  );
}

/**
 * Get all RPP entries sorted by RPP (most expensive first).
 */
export function getAllMetrosSorted(): RppEntry[] {
  return [...RPP_ENTRIES].sort((a, b) => b.rpp - a.rpp);
}

/** Convert an RPP index value to a scorer multiplier. */
function rppToMultiplier(rpp: number): number {
  return Math.round((rpp / RPP_BASELINE) * 1000) / 1000;
}
