import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCompany, getAllCompanies } from "../db/cache.js";

export function registerGetCompanyInfo(server: McpServer) {
  server.registerTool(
    "get_company_info",
    {
      description:
        "Returns detailed metadata for a single discovered company from SQLite. Includes name, description, ATS platform, departments, locations, open role count, and careers URL. Used during the interview to drill into specific companies the user asks about.",
      inputSchema: {
        company_id: z
          .string()
          .describe(
            "Company ID in format 'ats:slug' (e.g., 'greenhouse:anthropic'). Use 'list' to see all discovered companies."
          ),
      },
    },
    async ({ company_id }) => {
      if (company_id === "list") {
        const companies = await getAllCompanies();
        if (companies.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No companies discovered yet. Run `run_setup` first to discover companies.",
              },
            ],
          };
        }

        const list = companies
          .map((c) => `- **${c.name}** — \`${c.id}\` (${c.open_role_count} roles)`)
          .join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `# Discovered Companies (${companies.length})\n\n${list}`,
            },
          ],
        };
      }

      const company = await getCompany(company_id);
      if (!company) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Company "${company_id}" not found. Use company_id="list" to see all discovered companies.`,
            },
          ],
        };
      }

      const departments =
        company.departments.length > 0 ? company.departments.join(", ") : "Not available";
      const locations =
        company.locations.length > 0 ? company.locations.join(", ") : "Not available";
      const description = company.description || "No description available";
      const culture = company.culture_keywords
        ? company.culture_keywords.join(", ")
        : "Not available";

      const text = `# ${company.name}

**ATS Platform:** ${company.ats_platform}
**Careers URL:** ${company.careers_url}
**Open Roles:** ${company.open_role_count}
**Last Updated:** ${company.updated_at}

## Description
${description}

## Departments
${departments}

## Locations
${locations}

## Culture Keywords
${culture}

## Additional Info
- **Industry:** ${company.industry || "Unknown"}
- **Funding Stage:** ${company.funding_stage || "Unknown"}
- **Headcount:** ${company.headcount_range || "Unknown"}`;

      return { content: [{ type: "text" as const, text }] };
    }
  );
}
