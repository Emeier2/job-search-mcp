import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SEED_LIST } from "../registry/seed.js";
import { getSource, PLATFORM_PRIORITY } from "../sources/registry.js";
import { upsertCompany } from "../db/cache.js";
import { persistDb } from "../db/schema.js";
import type { CompanyMetadata } from "../types.js";

export function registerRunSetup(server: McpServer) {
  server.registerTool(
    "run_setup",
    {
      description:
        "The single entry point for job search setup. Probes a curated seed list of ~150 company slugs across Greenhouse, Lever, and Ashby to discover which companies have active job boards. Fetches metadata (name, description, departments, locations, open role counts) for each found company and stores it in SQLite. Returns a summary of discovered companies plus an interview guide for the LLM to conduct the preference interview. Optionally accepts additional company slugs to probe beyond the seed list.",
      inputSchema: {
        extra_companies: z
          .array(
            z.object({
              slug: z.string().describe("Company slug on the ATS platform"),
              ats: z.enum(["greenhouse", "lever", "ashby"]).describe("ATS platform"),
            })
          )
          .optional()
          .describe("Additional company slugs to probe beyond the built-in seed list"),
      },
    },
    async ({ extra_companies }) => {
      const entries = [...SEED_LIST];
      if (extra_companies) {
        entries.push(...extra_companies);
      }

      // Deduplicate by slug+ats
      const seen = new Set<string>();
      const unique = entries.filter((e) => {
        const key = `${e.ats}:${e.slug}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      console.error(`[run_setup] Probing ${unique.length} company slugs across 3 ATS platforms...`);

      const discovered: CompanyMetadata[] = [];
      const errors: string[] = [];

      // Process in batches of 10 to avoid overwhelming APIs
      const BATCH_SIZE = 10;
      for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        const batch = unique.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (entry) => {
            const source = getSource(entry.ats);
            if (!source) {
              errors.push(`Unknown ATS: ${entry.ats}`);
              return null;
            }

            const result = await source.fetchBoardInfo(entry.slug);
            if (!result.ok) {
              // Not an error — just means this slug doesn't exist on this platform
              return null;
            }

            const board = result.data;
            const id = `${entry.ats}:${entry.slug}`;
            const now = new Date().toISOString();

            const company: CompanyMetadata = {
              id,
              name: board.name || entry.slug,
              ats_platform: entry.ats,
              ats_slug: entry.slug,
              description: board.description,
              mission_values: null,
              industry: null,
              funding_stage: null,
              headcount_range: null,
              culture_keywords: null,
              careers_url: getAtsUrl(entry.ats, entry.slug),
              board_content_html: board.content_html,
              open_role_count: board.job_count,
              departments: board.departments,
              locations: board.locations,
              discovered_at: now,
              updated_at: now,
            };

            await upsertCompany(company);
            return company;
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled" && r.value) {
            discovered.push(r.value);
          }
        }

        // Brief pause between batches
        if (i + BATCH_SIZE < unique.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      persistDb();

      console.error(`[run_setup] Discovered ${discovered.length} companies with active boards`);

      // Build summary for the LLM
      const companySummaries = discovered
        .sort((a, b) => {
          const pa = PLATFORM_PRIORITY[a.ats_platform] ?? 99;
          const pb = PLATFORM_PRIORITY[b.ats_platform] ?? 99;
          return pa !== pb ? pa - pb : b.open_role_count - a.open_role_count;
        })
        .map((c) => {
          const depts = c.departments.length > 0 ? c.departments.slice(0, 5).join(", ") : "N/A";
          const locs = c.locations.length > 0 ? c.locations.slice(0, 5).join(", ") : "N/A";
          return `- **${c.name}** (${c.ats_platform}) — ${c.open_role_count} open roles\n  Departments: ${depts}\n  Locations: ${locs}`;
        })
        .join("\n");

      const interviewGuide = `
## Interview Guide

You've discovered ${discovered.length} companies with active job boards (${errors.length} probes failed).

**Now interview the user to build their preference profile.** Ask about:

1. **Roles & titles** — What job titles are you looking for? (e.g., "platform engineer", "AI engineer", "developer experience")
2. **Skills & technologies** — What should appear in job descriptions? (e.g., "TypeScript", "Python", "MCP", "SDK")
3. **Exclusions** — What titles/levels should be filtered OUT? (e.g., "senior staff", "principal", "VP", "director")
4. **Locations** — Where are you willing to work? (e.g., "remote", "San Francisco", "Seattle")
5. **Salary floor** — What's your minimum acceptable salary?
6. **Seniority** — What levels? (e.g., "mid", "senior")
7. **Company shortlist** — Based on their preferences and the discovered companies above, recommend which companies to track. The user should approve the final list.
8. **Polling frequency** — How often should we check for new jobs? (default: every 6 hours)
9. **Score threshold** — Minimum match score to surface? (default: 5)

After the interview, call \`save_preferences\` with the structured profile, then call \`setup_polling\` to configure automatic job checking.
`;

      const text = `# Company Discovery Complete

**Probed:** ${unique.length} slugs across Greenhouse, Lever, and Ashby
**Discovered:** ${discovered.length} companies with active job boards
**Total open roles found:** ${discovered.reduce((sum, c) => sum + c.open_role_count, 0)}

## Discovered Companies

${companySummaries}

${interviewGuide}`;

      return { content: [{ type: "text" as const, text }] };
    }
  );
}

function getAtsUrl(ats: string, slug: string): string {
  switch (ats) {
    case "greenhouse":
      return `https://boards.greenhouse.io/${slug}`;
    case "lever":
      return `https://jobs.lever.co/${slug}`;
    case "ashby":
      return `https://jobs.ashbyhq.com/${slug}`;
    default:
      return "";
  }
}
