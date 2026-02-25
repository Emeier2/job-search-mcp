import type { JobSource, Result, BoardInfo, JobDetails } from "../types.js";
import { htmlToText } from "../utils/html-to-text.js";
import { parseSalary } from "../utils/salary-parser.js";

const API_URL = "https://api.ashbyhq.com/posting-api";

interface AshbyJob {
  id: string;
  title: string;
  location: string;
  department: string;
  employmentType: string;
  descriptionHtml: string;
  publishedAt: string;
  applicationUrl: string;
  isRemote: boolean;
  compensation?: {
    compensationTierSummary: string;
  };
}

interface AshbyJobsResponse {
  jobs: AshbyJob[];
}

interface AshbyInfoResponse {
  name: string;
  aboutHtml: string | null;
}

export const ashby: JobSource = {
  name: "ashby",

  async fetchBoardInfo(slug: string): Promise<Result<BoardInfo>> {
    try {
      const [infoRes, jobsRes] = await Promise.all([
        fetch(`${API_URL}/job-board/${slug}`),
        fetch(`${API_URL}/job-board/${slug}/jobs`),
      ]);

      if (!infoRes.ok) {
        return { ok: false, error: `Ashby board not found for "${slug}" (${infoRes.status})` };
      }

      const info = (await infoRes.json()) as AshbyInfoResponse;
      const jobsData = jobsRes.ok ? (await jobsRes.json()) as AshbyJobsResponse : { jobs: [] };

      const departments = [
        ...new Set(
          jobsData.jobs.map((j) => j.department).filter((d) => !!d)
        ),
      ];

      const locations = [
        ...new Set(
          jobsData.jobs.map((j) => j.location).filter((l) => !!l)
        ),
      ];

      return {
        ok: true,
        data: {
          name: info.name || slug,
          description: info.aboutHtml ? htmlToText(info.aboutHtml) : null,
          content_html: info.aboutHtml || null,
          departments,
          locations,
          job_count: jobsData.jobs.length,
        },
      };
    } catch (err) {
      return { ok: false, error: `Ashby error for "${slug}": ${(err as Error).message}` };
    }
  },

  async fetchJobs(slug: string): Promise<Result<JobDetails[]>> {
    try {
      const res = await fetch(`${API_URL}/job-board/${slug}/jobs`);
      if (!res.ok) {
        return { ok: false, error: `Ashby jobs not found for "${slug}" (${res.status})` };
      }

      const data = (await res.json()) as AshbyJobsResponse;

      const jobs: JobDetails[] = data.jobs.map((j) => {
        const text = j.descriptionHtml ? htmlToText(j.descriptionHtml) : "";
        const salary = parseSalary(j.compensation?.compensationTierSummary || text);

        return {
          external_id: j.id,
          title: j.title,
          location: j.location || null,
          department: j.department || null,
          description_html: j.descriptionHtml || null,
          application_url: j.applicationUrl || null,
          date_posted: j.publishedAt || null,
          salary_min: salary?.min ?? null,
          salary_max: salary?.max ?? null,
          salary_currency: "USD",
          tags: extractTags(j, text),
        };
      });

      return { ok: true, data: jobs };
    } catch (err) {
      return { ok: false, error: `Ashby fetch error for "${slug}": ${(err as Error).message}` };
    }
  },

  async fetchJobDetails(slug: string, jobId: string): Promise<Result<JobDetails>> {
    try {
      const res = await fetch(`${API_URL}/posting/${jobId}`);
      if (!res.ok) {
        return { ok: false, error: `Ashby job ${jobId} not found (${res.status})` };
      }

      const j = (await res.json()) as AshbyJob;
      const text = j.descriptionHtml ? htmlToText(j.descriptionHtml) : "";
      const salary = parseSalary(j.compensation?.compensationTierSummary || text);

      return {
        ok: true,
        data: {
          external_id: j.id,
          title: j.title,
          location: j.location || null,
          department: j.department || null,
          description_html: j.descriptionHtml || null,
          application_url: j.applicationUrl || null,
          date_posted: j.publishedAt || null,
          salary_min: salary?.min ?? null,
          salary_max: salary?.max ?? null,
          salary_currency: "USD",
          tags: extractTags(j, text),
        },
      };
    } catch (err) {
      return { ok: false, error: `Ashby detail error for "${slug}/${jobId}": ${(err as Error).message}` };
    }
  },
};

function extractTags(job: AshbyJob, text: string): string[] {
  const tags: string[] = [];
  const lower = ((job.location || "") + " " + text).toLowerCase();

  if (job.isRemote || /\bremote\b/.test(lower)) tags.push("remote");
  if (/\bhybrid\b/.test(lower)) tags.push("hybrid");
  if (/\bvisa\s*sponsor/i.test(lower)) tags.push("visa_sponsorship");
  if (/\bequity\b/.test(lower)) tags.push("equity");
  if (job.employmentType) {
    tags.push(job.employmentType.toLowerCase().replace(/\s+/g, "_"));
  }

  return tags;
}
