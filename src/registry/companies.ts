import { getCompany, getAllCompanies } from "../db/cache.js";
import type { CompanyMetadata } from "../types.js";

/**
 * Look up a company by its normalized slug (id) from SQLite.
 * Data is populated by run_setup discovery.
 */
export async function lookupCompany(id: string): Promise<CompanyMetadata | null> {
  return getCompany(id);
}

/**
 * Get all discovered companies from SQLite.
 */
export async function listCompanies(): Promise<CompanyMetadata[]> {
  return getAllCompanies();
}
