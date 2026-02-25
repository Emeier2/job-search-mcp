import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerRunSetup } from "./tools/run-setup.js";
import { registerGetCompanyInfo } from "./tools/get-company-info.js";
import { registerSavePreferences } from "./tools/save-preferences.js";
import { registerSetupPolling } from "./tools/setup-polling.js";
import { registerGetMatches } from "./tools/get-matches.js";
import { registerListCompanyJobs } from "./tools/list-company-jobs.js";
import { registerGetJobDetails } from "./tools/get-job-details.js";
import { registerGetResumeContext } from "./tools/get-resume-context.js";
import { registerSearchJobs } from "./tools/search-jobs.js";
import { registerCheckJobStatus } from "./tools/check-job-status.js";

const server = new McpServer({
  name: "job-search-mcp",
  version: "1.0.0",
});

async function main() {
  // Setup tools
  registerRunSetup(server);
  registerGetCompanyInfo(server);
  registerSavePreferences(server);
  registerSetupPolling(server);

  // Query tools
  registerGetMatches(server);
  registerListCompanyJobs(server);
  registerGetJobDetails(server);
  registerGetResumeContext(server);
  registerSearchJobs(server);
  registerCheckJobStatus(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("job-search-mcp server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
