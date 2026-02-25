import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchJobs } from "../db/search.js";
import { getCompany } from "../db/cache.js";

export function registerSearchJobs(server: McpServer) {
  server.registerTool(
    "search_jobs",
    {
      description:
        "Full-text search across all cached jobs using SQLite FTS5. Searches job titles, descriptions, company IDs, and tags. For ad-hoc queries beyond the preference profile (e.g., 'machine learning', 'remote python', 'devtools').",
      inputSchema: {
        query: z.string().describe("Search query (e.g., 'platform engineer', 'TypeScript SDK')"),
        limit: z.number().optional().describe("Maximum results to return (default: 25)"),
      },
    },
    async ({ query, limit }) => {
      const jobs = await searchJobs(query, limit ?? 25);

      if (jobs.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No jobs found matching "${query}". The database may be empty — run the poller first.`,
            },
          ],
        };
      }

      // Resolve company names
      const companyNames = new Map<string, string>();
      for (const job of jobs) {
        if (!companyNames.has(job.company_id)) {
          const c = await getCompany(job.company_id);
          companyNames.set(job.company_id, c?.name || job.company_id);
        }
      }

      let output = `# Search Results for "${query}" (${jobs.length} found)\n\n`;

      for (const job of jobs) {
        const companyName = companyNames.get(job.company_id) || job.company_id;
        const loc = job.location ? ` | ${job.location}` : "";
        const salary =
          job.salary_min && job.salary_max
            ? ` | $${job.salary_min.toLocaleString()}-$${job.salary_max.toLocaleString()}`
            : "";
        const dept = job.department ? ` | ${job.department}` : "";

        output += `- **${job.title}** @ ${companyName} — score: ${job.score}${dept}${loc}${salary}\n`;
        output += `  ID: \`${job.source}\` / \`${job.company_id}\` / \`${job.external_id}\`\n`;
        if (job.application_url) output += `  Apply: ${job.application_url}\n`;
        output += "\n";
      }

      return { content: [{ type: "text" as const, text: output }] };
    }
  );
}
