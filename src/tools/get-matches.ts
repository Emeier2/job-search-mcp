import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getTopMatches } from "../db/cache.js";
import { getCompany } from "../db/cache.js";
import { loadPreferences } from "../utils/preferences.js";
import { getColAnnotation, lookupCol } from "../data/col-lookup.js";

export function registerGetMatches(server: McpServer) {
  server.registerTool(
    "get_matches",
    {
      description:
        "Returns top-scoring jobs from SQLite above the score threshold. The primary 'show me my matches' tool. All scoring is pre-computed by the background poller — this just reads from the database. Results are grouped by department with scores and match details.",
      inputSchema: {
        limit: z
          .number()
          .optional()
          .describe("Maximum number of results to return (default: 25)"),
        company: z
          .string()
          .optional()
          .describe("Filter to a specific company ID (e.g., 'greenhouse:anthropic')"),
        location: z
          .string()
          .optional()
          .describe("Filter by location substring (e.g., 'remote', 'San Francisco')"),
        days: z
          .number()
          .optional()
          .describe("Only show jobs scraped within the last N days"),
        threshold: z
          .number()
          .optional()
          .describe("Override score threshold (default: from preferences)"),
      },
    },
    async ({ limit, company, location, days, threshold }) => {
      const prefs = loadPreferences();
      const scoreThreshold = threshold ?? prefs?.score_threshold ?? 5;

      const jobs = await getTopMatches({
        threshold: scoreThreshold,
        limit: limit ?? 25,
        company,
        location,
        days,
      });

      if (jobs.length === 0) {
        const reasons = [];
        if (!prefs) reasons.push("No preferences saved — run setup first");
        reasons.push(`No jobs found above score threshold ${scoreThreshold}`);
        if (company) reasons.push(`Filtered to company: ${company}`);
        if (location) reasons.push(`Filtered to location: ${location}`);
        if (days) reasons.push(`Filtered to last ${days} days`);

        return {
          content: [
            {
              type: "text" as const,
              text: `# No Matches Found\n\n${reasons.map((r) => `- ${r}`).join("\n")}\n\nTry running the poller first: \`node build/poll.js\``,
            },
          ],
        };
      }

      // Group by department
      const byDept = new Map<string, typeof jobs>();
      for (const job of jobs) {
        const dept = job.department || "Other";
        if (!byDept.has(dept)) byDept.set(dept, []);
        byDept.get(dept)!.push(job);
      }

      // Resolve company names
      const companyNames = new Map<string, string>();
      for (const job of jobs) {
        if (!companyNames.has(job.company_id)) {
          const c = await getCompany(job.company_id);
          companyNames.set(job.company_id, c?.name || job.company_id);
        }
      }

      let output = `# Job Matches (${jobs.length} results, threshold: ${scoreThreshold})\n\n`;

      for (const [dept, deptJobs] of byDept) {
        output += `## ${dept}\n\n`;
        for (const job of deptJobs) {
          const companyName = companyNames.get(job.company_id) || job.company_id;
          const salary = job.salary_min && job.salary_max
            ? `$${job.salary_min.toLocaleString()}-$${job.salary_max.toLocaleString()}`
            : "Salary not listed";
          
          const colInfo = lookupCol(job.location);
          let colDisplay = colInfo.isRemote ? "Remote" : (colInfo.found ? `RPP ${colInfo.rpp}` : (job.location || "Unknown"));

          output += `- **${job.title}** @ ${companyName}\n`;
          output += `  URL: ${job.application_url || "N/A"}\n`;
          output += `  Salary: ${salary}\n`;
          output += `  COL: ${colDisplay}\n`;
          output += `  _Score: ${job.score}_\n\n`;
        }
      }

      return { content: [{ type: "text" as const, text: output }] };
    }
  );
}
