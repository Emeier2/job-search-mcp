import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { savePreferences, getPreferencesPath } from "../utils/preferences.js";
import type { Preferences } from "../types.js";

export function registerSavePreferences(server: McpServer) {
  server.registerTool(
    "save_preferences",
    {
      description:
        "Takes the structured preference profile from the interview and writes preferences.json to disk. Called by the LLM after interviewing the user about their job search criteria. The preferences control what the background poller fetches and how jobs are scored.",
      inputSchema: {
        title_keywords: z
          .array(
            z.object({
              term: z.string().describe("Keyword to match in job titles"),
              weight: z.number().describe("Score weight when matched (higher = more important)"),
            })
          )
          .describe("Keywords to match against job titles, with weights"),
        description_keywords: z
          .array(
            z.object({
              term: z.string().describe("Keyword to match in job descriptions"),
              weight: z.number().describe("Score weight when matched"),
            })
          )
          .describe("Keywords to match against job descriptions, with weights"),
        exclusions: z
          .array(z.string())
          .describe("Terms that disqualify a job if found in the title (e.g., 'VP', 'director')"),
        locations: z
          .array(z.string())
          .describe("Preferred work locations (e.g., 'remote', 'San Francisco')"),
        salary_min: z
          .number()
          .describe("Minimum acceptable annual salary in USD"),
        seniority: z
          .array(z.string())
          .describe("Target seniority levels (e.g., 'mid', 'senior')"),
        companies: z
          .array(
            z.object({
              name: z.string().describe("Company display name"),
              ats: z.enum(["greenhouse", "lever", "ashby"]).describe("ATS platform"),
              slug: z.string().describe("Company slug on the ATS"),
            })
          )
          .describe("Companies to track for new jobs"),
        polling_interval_hours: z
          .number()
          .optional()
          .describe("How often to poll for new jobs (default: 6 hours)"),
        score_threshold: z
          .number()
          .optional()
          .describe("Minimum score to surface a job as a match (default: 5)"),
      },
    },
    async (input) => {
      const prefs: Preferences = {
        title_keywords: input.title_keywords,
        description_keywords: input.description_keywords,
        exclusions: input.exclusions,
        locations: input.locations,
        salary_min: input.salary_min,
        seniority: input.seniority,
        companies: input.companies,
        polling_interval_hours: input.polling_interval_hours ?? 6,
        score_threshold: input.score_threshold ?? 5,
      };

      try {
        savePreferences(prefs);
        const path = getPreferencesPath();

        const summary = `# Preferences Saved

**File:** \`${path}\`

## Summary
- **Title keywords:** ${prefs.title_keywords.map((k) => `${k.term} (w:${k.weight})`).join(", ")}
- **Description keywords:** ${prefs.description_keywords.map((k) => `${k.term} (w:${k.weight})`).join(", ")}
- **Exclusions:** ${prefs.exclusions.join(", ")}
- **Locations:** ${prefs.locations.join(", ")}
- **Salary minimum:** $${prefs.salary_min.toLocaleString()}
- **Seniority:** ${prefs.seniority.join(", ")}
- **Companies tracked:** ${prefs.companies.length} (${prefs.companies.map((c) => c.name).join(", ")})
- **Polling interval:** every ${prefs.polling_interval_hours} hours
- **Score threshold:** ${prefs.score_threshold}

Next step: call \`setup_polling\` to configure automatic job checking.`;

        return { content: [{ type: "text" as const, text: summary }] };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error saving preferences: ${(err as Error).message}`,
            },
          ],
        };
      }
    }
  );
}
