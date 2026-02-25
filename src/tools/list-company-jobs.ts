import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCompanyJobs, getCompany } from "../db/cache.js";

export function registerListCompanyJobs(server: McpServer) {
  server.registerTool(
    "list_company_jobs",
    {
      description:
        "List all open positions at a specific company, sorted by score. Shows title, department, location, score, and application URL for each role.",
      inputSchema: {
        company_id: z
          .string()
          .describe("Company ID in format 'ats:slug' (e.g., 'greenhouse:anthropic')"),
      },
    },
    async ({ company_id }) => {
      const company = await getCompany(company_id);
      const jobs = await getCompanyJobs(company_id);

      if (jobs.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No jobs found for "${company_id}". The poller may not have run yet, or this company has no open positions.`,
            },
          ],
        };
      }

      const companyName = company?.name || company_id;

      // Group by department
      const byDept = new Map<string, typeof jobs>();
      for (const job of jobs) {
        const dept = job.department || "Other";
        if (!byDept.has(dept)) byDept.set(dept, []);
        byDept.get(dept)!.push(job);
      }

      let output = `# ${companyName} — Open Positions (${jobs.length})\n\n`;

      for (const [dept, deptJobs] of byDept) {
        output += `## ${dept} (${deptJobs.length})\n\n`;
        for (const job of deptJobs) {
          const loc = job.location ? ` | ${job.location}` : "";
          const salary =
            job.salary_min && job.salary_max
              ? ` | $${job.salary_min.toLocaleString()}-$${job.salary_max.toLocaleString()}`
              : "";

          output += `- **${job.title}** — score: ${job.score}${loc}${salary}\n`;
          output += `  ID: \`${job.source}\` / \`${job.company_id}\` / \`${job.external_id}\`\n`;
          if (job.application_url) output += `  Apply: ${job.application_url}\n`;
          output += "\n";
        }
      }

      return { content: [{ type: "text" as const, text: output }] };
    }
  );
}
