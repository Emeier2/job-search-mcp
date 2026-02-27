import type { JobSource, Result, BoardInfo, JobDetails } from "../types.js";
import { htmlToText } from "../utils/html-to-text.js";
import { parseSalary } from "../utils/salary-parser.js";

const BASE_URL = "https://boards-api.greenhouse.io/v1/boards";

interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string } | null;
  departments: { name: string }[];
  content: string;
  absolute_url: string;
  updated_at: string;
}

interface GreenhouseBoard {
  name: string;
  content: string;
}

interface GreenhouseDepartment {
  id: number;
  name: string;
  jobs: { id: number }[];
}

interface GreenhouseDepartmentsResponse {
  departments: GreenhouseDepartment[];
}

export const greenhouse: JobSource = {
  name: "greenhouse",

  async fetchBoardInfo(slug: string): Promise<Result<BoardInfo>> {
    try {
      // Fetch board metadata, departments, and jobs list in parallel
      const [boardRes, deptsRes, jobsRes] = await Promise.all([
        fetch(`${BASE_URL}/${slug}`),
        fetch(`${BASE_URL}/${slug}/departments`),
        fetch(`${BASE_URL}/${slug}/jobs?content=true`),
      ]);

      if (!boardRes.ok) {
        return { ok: false, error: `Greenhouse board not found for "${slug}" (${boardRes.status})` };
      }

      const board = (await boardRes.json()) as GreenhouseBoard;
      const deptsData = deptsRes.ok
        ? (await deptsRes.json()) as GreenhouseDepartmentsResponse
        : { departments: [] };
      const jobsData = jobsRes.ok ? (await jobsRes.json()) as { jobs: GreenhouseJob[] } : { jobs: [] };

      const departments = (deptsData.departments || [])
        .map((d) => d.name)
        .filter((n) => n && n !== "No Department");

      const locations = [
        ...new Set(
          jobsData.jobs
            .map((j) => j.location?.name)
            .filter((l): l is string => !!l && l !== "No Location")
        ),
      ];

      return {
        ok: true,
        data: {
          name: board.name,
          description: board.content ? htmlToText(board.content) : null,
          content_html: board.content || null,
          departments,
          locations,
          job_count: jobsData.jobs.length,
        },
      };
    } catch (err) {
      return { ok: false, error: `Greenhouse error for "${slug}": ${(err as Error).message}` };
    }
  },

  async fetchJobs(slug: string): Promise<Result<JobDetails[]>> {
    try {
      const res = await fetch(`${BASE_URL}/${slug}/jobs?content=true`);
      if (!res.ok) {
        return { ok: false, error: `Greenhouse jobs not found for "${slug}" (${res.status})` };
      }

      const data = (await res.json()) as { jobs: GreenhouseJob[] };

      const jobs: JobDetails[] = data.jobs.map((j) => {
        const text = j.content ? htmlToText(j.content) : "";
        const salary = parseSalary(text);
        return {
          external_id: String(j.id),
          title: j.title,
          location: j.location?.name || null,
          department: j.departments?.[0]?.name || null,
          description_html: j.content || null,
          application_url: j.absolute_url,
          date_posted: j.updated_at || null,
          salary_min: salary?.min ?? null,
          salary_max: salary?.max ?? null,
          salary_currency: "USD",
          tags: extractTags(j, text),
        };
      });

      return { ok: true, data: jobs };
    } catch (err) {
      return { ok: false, error: `Greenhouse fetch error for "${slug}": ${(err as Error).message}` };
    }
  },

  async fetchJobDetails(slug: string, jobId: string): Promise<Result<JobDetails>> {
    try {
      const res = await fetch(`${BASE_URL}/${slug}/jobs/${jobId}`);
      if (!res.ok) {
        return { ok: false, error: `Greenhouse job ${jobId} not found for "${slug}" (${res.status})` };
      }

      const j = (await res.json()) as GreenhouseJob;
      const text = j.content ? htmlToText(j.content) : "";
      const salary = parseSalary(text);

      return {
        ok: true,
        data: {
          external_id: String(j.id),
          title: j.title,
          location: j.location?.name || null,
          department: j.departments?.[0]?.name || null,
          description_html: j.content || null,
          application_url: j.absolute_url,
          date_posted: j.updated_at || null,
          salary_min: salary?.min ?? null,
          salary_max: salary?.max ?? null,
          salary_currency: "USD",
          tags: extractTags(j, text),
        },
      };
    } catch (err) {
      return { ok: false, error: `Greenhouse detail error for "${slug}/${jobId}": ${(err as Error).message}` };
    }
  },
};

function extractTags(job: GreenhouseJob, text: string): string[] {
  const tags: string[] = [];
  const lower = (job.location?.name || "").toLowerCase() + " " + text.toLowerCase();

  if (/\bremote\b/.test(lower)) tags.push("remote");
  if (/\bhybrid\b/.test(lower)) tags.push("hybrid");
  if (/\bvisa\s*sponsor/i.test(lower)) tags.push("visa_sponsorship");
  if (/\bequity\b/.test(lower)) tags.push("equity");
  if (/\brelocation\b/.test(lower)) tags.push("relocation");

  return tags;
}
