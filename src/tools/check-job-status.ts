import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerCheckJobStatus(server: McpServer) {
  server.registerTool(
    "check_job_status",
    {
      description:
        "Verify if a job posting URL is still live by sending an HTTP HEAD request. Returns the HTTP status code and whether the posting appears to still be active. Useful for checking if a saved job has been taken down.",
      inputSchema: {
        url: z.string().describe("The full URL of the job posting to check"),
      },
    },
    async ({ url }) => {
      try {
        const res = await fetch(url, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
        });

        const isLive = res.ok;
        const statusText = `${res.status} ${res.statusText}`;
        const finalUrl = res.url !== url ? `\n**Redirected to:** ${res.url}` : "";

        const text = `# Job Status Check

**URL:** ${url}
**Status:** ${statusText}
**Is Live:** ${isLive ? "Yes" : "No — this posting may have been removed"}${finalUrl}`;

        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        const message = (err as Error).message;
        const isTimeout = message.includes("timeout") || message.includes("abort");

        return {
          content: [
            {
              type: "text" as const,
              text: `# Job Status Check

**URL:** ${url}
**Status:** ${isTimeout ? "Timeout" : "Error"}
**Details:** ${message}

The posting could not be reached. It may be down, or there could be a network issue.`,
            },
          ],
        };
      }
    }
  );
}
