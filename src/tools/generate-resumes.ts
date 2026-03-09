import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getTopMatches, getCompany } from "../db/cache.js";
import { loadPreferences } from "../utils/preferences.js";
import { callGDriveTool } from "../utils/gdrive.js";

const RESUME_FOLDER_ID = "1dm_i6JCTL7Z0e0BcuSsv0G9xtncI91Yg"; // "Search" folder ID
const DEFAULT_BASE_RESUME_ID = "12EmRMnj11lvoevse876yCOfeZsyUaHYY"; // 01_Anthropic_Agent_SDK_Claude_Code

export function registerGenerateResumes(server: McpServer) {
  server.registerTool(
    "generate_resumes",
    {
      description:
        "Copies a base resume for top matches into the 'Search' folder on Google Drive, organized by company folders.",
      inputSchema: {
        limit: z
          .number()
          .optional()
          .describe("Maximum number of jobs to process (default: 5)"),
        threshold: z
          .number()
          .optional()
          .describe("Score threshold for resume generation (default: from preferences)"),
        baseResumeId: z
          .string()
          .optional()
          .describe("Google Drive ID of the resume to use as a template"),
      },
    },
    async ({ limit, threshold, baseResumeId }) => {
      const prefs = loadPreferences();
      const scoreThreshold = threshold ?? prefs?.score_threshold ?? 7;
      const count = limit ?? 5;
      const baseId = baseResumeId || (prefs as any)?.base_resume_id || DEFAULT_BASE_RESUME_ID;

      const jobs = await getTopMatches({
        threshold: scoreThreshold,
        limit: count,
      });

      if (jobs.length === 0) {
        return {
          content: [{ type: "text", text: "No matches found above the threshold." }],
        };
      }

      const results: string[] = [];
      const companyFolders = new Map<string, string>();

      for (const job of jobs) {
        try {
          const companyMeta = await getCompany(job.company_id);
          const companyName = companyMeta?.name || job.company_id;

          // 1. Ensure company folder exists
          let folderId = companyFolders.get(companyName);
          if (!folderId) {
            const searchResp = await callGDriveTool("search", {
              query: `name = '${companyName}' and '${RESUME_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
              rawQuery: true
            });
            
            const searchMatch = searchResp.result.content[0].text.match(/\[id: ([a-zA-Z0-9_-]+)/);
            if (searchMatch) {
              folderId = searchMatch[1];
            } else {
              const createResp = await callGDriveTool("createFolder", {
                name: companyName,
                parent: RESUME_FOLDER_ID,
              });
              const createMatch = createResp.result.content[0].text.match(/ID: ([a-zA-Z0-9_-]+)/);
              folderId = createMatch ? createMatch[1] : null;
            }
            
            if (folderId) {
              companyFolders.set(companyName, folderId);
            }
          }

          if (!folderId) {
            results.push(`❌ Failed to find/create folder for ${companyName}`);
            continue;
          }

          // 2. Copy the base resume
          const newName = `Resume - ${companyName} - ${job.title.replace(/[^a-zA-Z0-9 ]/g, "")}`;
          
          await callGDriveTool("copyFile", {
            fileId: baseId,
            newName: newName,
            parentFolderId: folderId,
          });

          results.push(`✅ Copied resume for **${job.title}** into folder **${companyName}**`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          results.push(`❌ Error processing **${job.title}**: ${msg}`);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `# Resume Organization Results\n\nBase Resume ID: \`${baseId}\`\n\n${results.join("\n")}`,
          },
        ],
      };
    }
  );
}
