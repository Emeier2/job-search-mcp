import type { JobSource, Result, BoardInfo, JobDetails } from "../types.js";
import { htmlToText } from "../utils/html-to-text.js";
import { parseSalary } from "../utils/salary-parser.js";

const BASE_URL = "https://api.lever.co/v0/postings";

interface LeverPosting {
  id: string;
  text: string;
  categories: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
    allLocations?: string[];
  };
  description: string;
  descriptionPlain: string;
  additional: string;
  additionalPlain: string;
  hostedUrl: string;
  applyUrl: string;
  createdAt: number;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
}

export const lever: JobSource = {
  name: "lever",

  async fetchBoardInfo(slug: string): Promise<Result<BoardInfo>> {
    try {
      const res = await fetch(`${BASE_URL}/${slug}?mode=json`);
      if (!res.ok) {
        return { ok: false, error: `Lever board not found for "${slug}" (${res.status})` };
      }

      const postings = (await res.json()) as LeverPosting[];

      const departments = [
        ...new Set(
          postings
            .map((p) => p.categories.department)
            .filter((d): d is string => !!d)
        ),
      ];

      const locations = [
        ...new Set(
          postings
            .flatMap((p) => {
              const locs: string[] = [];
              if (p.categories.location) locs.push(p.categories.location);
              if (p.categories.allLocations) locs.push(...p.categories.allLocations);
              return locs;
            })
            .filter((l) => !!l)
        ),
      ];

      return {
        ok: true,
        data: {
          name: slug,
          description: null,
          content_html: null,
          departments,
          locations,
          job_count: postings.length,
        },
      };
    } catch (err) {
      return { ok: false, error: `Lever error for "${slug}": ${(err as Error).message}` };
    }
  },

  async fetchJobs(slug: string): Promise<Result<JobDetails[]>> {
    try {
      const res = await fetch(`${BASE_URL}/${slug}?mode=json`);
      if (!res.ok) {
        return { ok: false, error: `Lever jobs not found for "${slug}" (${res.status})` };
      }

      const postings = (await res.json()) as LeverPosting[];

      const jobs: JobDetails[] = postings.map((p) => {
        const fullText = (p.descriptionPlain || "") + " " + (p.additionalPlain || "");
        const salary = p.salaryRange || parseSalary(fullText);

        return {
          external_id: p.id,
          title: p.text,
          location: p.categories.location || null,
          department: p.categories.department || null,
          description_html: (p.description || "") + (p.additional || ""),
          application_url: p.hostedUrl,
          date_posted: p.createdAt ? new Date(p.createdAt).toISOString() : null,
          salary_min: salary?.min ?? null,
          salary_max: salary?.max ?? null,
          salary_currency: (p.salaryRange?.currency as string) || "USD",
          tags: extractTags(p, fullText),
        };
      });

      return { ok: true, data: jobs };
    } catch (err) {
      return { ok: false, error: `Lever fetch error for "${slug}": ${(err as Error).message}` };
    }
  },

  async fetchJobDetails(slug: string, jobId: string): Promise<Result<JobDetails>> {
    try {
      const res = await fetch(`${BASE_URL}/${slug}/${jobId}`);
      if (!res.ok) {
        return { ok: false, error: `Lever job ${jobId} not found for "${slug}" (${res.status})` };
      }

      const p = (await res.json()) as LeverPosting;
      const fullText = (p.descriptionPlain || "") + " " + (p.additionalPlain || "");
      const salary = p.salaryRange || parseSalary(fullText);

      return {
        ok: true,
        data: {
          external_id: p.id,
          title: p.text,
          location: p.categories.location || null,
          department: p.categories.department || null,
          description_html: (p.description || "") + (p.additional || ""),
          application_url: p.hostedUrl,
          date_posted: p.createdAt ? new Date(p.createdAt).toISOString() : null,
          salary_min: salary?.min ?? null,
          salary_max: salary?.max ?? null,
          salary_currency: (p.salaryRange?.currency as string) || "USD",
          tags: extractTags(p, fullText),
        },
      };
    } catch (err) {
      return { ok: false, error: `Lever detail error for "${slug}/${jobId}": ${(err as Error).message}` };
    }
  },
};

function extractTags(posting: LeverPosting, text: string): string[] {
  const tags: string[] = [];
  const lower = ((posting.categories.location || "") + " " + text).toLowerCase();

  if (/\bremote\b/.test(lower)) tags.push("remote");
  if (/\bhybrid\b/.test(lower)) tags.push("hybrid");
  if (/\bvisa\s*sponsor/i.test(lower)) tags.push("visa_sponsorship");
  if (/\bequity\b/.test(lower)) tags.push("equity");
  if (posting.categories.commitment) {
    tags.push(posting.categories.commitment.toLowerCase().replace(/\s+/g, "_"));
  }

  return tags;
}
