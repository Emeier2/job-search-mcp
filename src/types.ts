// Result type — sources never throw
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Preference profile
export interface KeywordWeight {
  term: string;
  weight: number;
}

export interface CompanyEntry {
  name: string;
  ats: "greenhouse" | "lever" | "ashby";
  slug: string;
}

export interface Preferences {
  title_keywords: KeywordWeight[];
  description_keywords: KeywordWeight[];
  exclusions: string[];
  locations: string[];
  salary_min: number;
  seniority: string[];
  companies: CompanyEntry[];
  polling_interval_hours: number;
  score_threshold: number;
}

// Company metadata from ATS board pages
export interface CompanyMetadata {
  id: string;
  name: string;
  ats_platform: "greenhouse" | "lever" | "ashby";
  ats_slug: string;
  description: string | null;
  mission_values: string | null;
  industry: string | null;
  funding_stage: string | null;
  headcount_range: string | null;
  culture_keywords: string[] | null;
  careers_url: string;
  board_content_html: string | null;
  open_role_count: number;
  departments: string[];
  locations: string[];
  discovered_at: string;
  updated_at: string;
}

// Job listing (stored in SQLite)
export interface JobListing {
  id: string;
  source: string;
  company_id: string;
  external_id: string;
  title: string;
  location: string | null;
  department: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  description_html: string | null;
  description_text: string | null;
  application_url: string | null;
  date_posted: string | null;
  date_scraped: string;
  is_live: boolean;
  tags: string[];
  score: number;
  score_breakdown: Record<string, number> | null;
}

// What a job source returns for a single job
export interface JobDetails {
  external_id: string;
  title: string;
  location: string | null;
  department: string | null;
  description_html: string | null;
  application_url: string | null;
  date_posted: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  tags: string[];
}

// Board-level info from an ATS source
export interface BoardInfo {
  name: string;
  description: string | null;
  content_html: string | null;
  departments: string[];
  locations: string[];
  job_count: number;
}

// Interface that each ATS source implements
export interface JobSource {
  name: string;
  fetchBoardInfo(slug: string): Promise<Result<BoardInfo>>;
  fetchJobs(slug: string): Promise<Result<JobDetails[]>>;
  fetchJobDetails(slug: string, jobId: string): Promise<Result<JobDetails>>;
}

// Scoring result
export interface ScoreResult {
  score: number;
  breakdown: Record<string, number>;
}
