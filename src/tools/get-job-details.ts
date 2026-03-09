import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getJob, getCompany } from "../db/cache.js";
import { formatColContext } from "../data/col-lookup.js";
import { loadPreferences } from "../utils/preferences.js";

export function registerGetJobDetails(server: McpServer) {
  server.registerTool(
    "get_job_details",
    {
      description:
        "Returns the full job description for a single posting from SQLite. Includes title, company, department, location, salary, cost-of-living context, full description text, tags, score breakdown, and application URL.",
      inputSchema: {
        source: z.string().describe("ATS platform (e.g., 'greenhouse', 'lever', 'ashby')"),
        company: z.string().describe("Company slug (e.g., 'anthropic')"),
        job_id: z.string().describe("External job ID from the ATS"),
      },
    },
    async ({ source, company, job_id }) => {
      // Try with ats:slug as company_id first
      let job = await getJob(source, `${source}:${company}`, job_id);
      // Fallback: try raw company value
      if (!job) {
        job = await getJob(source, company, job_id);
      }

      if (!job) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Job not found: ${source}/${company}/${job_id}. Make sure the poller has run and the IDs are correct.`,
            },
          ],
        };
      }

      const companyMeta = await getCompany(job.company_id);
      const companyName = companyMeta?.name || job.company_id;

      const salary =
        job.salary_min && job.salary_max
          ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()} ${job.salary_currency}`
          : "Not listed";

      const breakdown = job.score_breakdown
        ? Object.entries(job.score_breakdown)
            .map(([k, v]) => `- ${k}: +${v}`)
            .join("\n")
        : "No breakdown available";

      const prefs = loadPreferences();
      const userFloor = prefs?.salary_min ?? 0;
      const colContext = formatColContext(job.location, job.salary_min, job.salary_max, userFloor);

      const text = `# ${job.title}

**Company:** ${companyName}
**Department:** ${job.department || "Not specified"}
**Location:** ${job.location || "Not specified"}
**Salary:** ${salary}
**Posted:** ${job.date_posted || "Unknown"}
**Last Scraped:** ${job.date_scraped}
**Score:** ${job.score}
**Tags:** ${job.tags.length > 0 ? job.tags.join(", ") : "None"}

## Cost of Living
${colContext}

## Apply
${job.application_url || "No URL available"}

## Score Breakdown
${breakdown}

## Full Description

${job.description_text || "No description available"}`;

      return { content: [{ type: "text" as const, text }] };
    }
  );
}
