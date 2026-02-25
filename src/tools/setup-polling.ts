import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPreferences } from "../utils/preferences.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");

export function registerSetupPolling(server: McpServer) {
  server.registerTool(
    "setup_polling",
    {
      description:
        "Detects the user's OS and returns platform-specific instructions and commands for setting up scheduled polling. The poller runs as a background task on a schedule, fetching jobs and scoring them against preferences. This tool does NOT execute anything — it provides instructions so the LLM can guide the user step by step.",
      inputSchema: {
        interval_hours: z
          .number()
          .optional()
          .describe(
            "Override polling interval in hours. If not provided, reads from saved preferences (default: 6)."
          ),
      },
    },
    async ({ interval_hours }) => {
      const prefs = loadPreferences();
      const hours = interval_hours ?? prefs?.polling_interval_hours ?? 6;
      const minutes = hours * 60;

      const pollScript = join(PROJECT_ROOT, "build", "poll.js");
      const nodePath = process.execPath;
      const platform = process.platform;

      let instructions: string;

      if (platform === "win32") {
        instructions = getWindowsInstructions(nodePath, pollScript, minutes);
      } else if (platform === "darwin") {
        instructions = getMacInstructions(nodePath, pollScript, minutes);
      } else {
        instructions = getLinuxInstructions(nodePath, pollScript, hours);
      }

      const text = `# Polling Setup

**Platform detected:** ${platformName(platform)}
**Polling interval:** every ${hours} hour(s)
**Poller script:** \`${pollScript}\`

${instructions}

## Manual Run

To test the poller manually before scheduling:
\`\`\`bash
node "${pollScript}"
\`\`\`

## What the Poller Does

1. Reads \`preferences.json\` for your company list
2. Fetches all jobs from each company's ATS API
3. Scores each job against your keyword preferences
4. Writes/updates SQLite database with jobs, scores, and FTS index
5. Logs summary to stderr and exits`;

      return { content: [{ type: "text" as const, text }] };
    }
  );
}

function platformName(platform: string): string {
  switch (platform) {
    case "win32": return "Windows";
    case "darwin": return "macOS";
    case "linux": return "Linux";
    default: return platform;
  }
}

function getWindowsInstructions(nodePath: string, pollScript: string, intervalMinutes: number): string {
  const taskName = "JobSearchMCPPoller";
  return `## Windows Task Scheduler

Run this PowerShell command (as Administrator) to create the scheduled task:

\`\`\`powershell
schtasks /create /tn "${taskName}" /tr "\\"${nodePath}\\" \\"${pollScript}\\"" /sc minute /mo ${intervalMinutes} /f
\`\`\`

### Manage the Task

- **View:** \`schtasks /query /tn "${taskName}"\`
- **Run now:** \`schtasks /run /tn "${taskName}"\`
- **Delete:** \`schtasks /delete /tn "${taskName}" /f\`
- **Disable:** \`schtasks /change /tn "${taskName}" /disable\``;
}

function getMacInstructions(nodePath: string, pollScript: string, intervalMinutes: number): string {
  const intervalSeconds = intervalMinutes * 60;
  const plistName = "com.jobsearch.mcp.poller";
  const plistPath = `~/Library/LaunchAgents/${plistName}.plist`;

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${plistName}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${pollScript}</string>
    </array>
    <key>StartInterval</key>
    <integer>${intervalSeconds}</integer>
    <key>StandardErrorPath</key>
    <string>/tmp/job-search-mcp-poller.log</string>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>`;

  return `## macOS launchd

### Step 1: Create the plist file

Write this to \`${plistPath}\`:

\`\`\`xml
${plistContent}
\`\`\`

### Step 2: Load the agent

\`\`\`bash
launchctl load ${plistPath}
\`\`\`

### Manage

- **Status:** \`launchctl list | grep jobsearch\`
- **Unload:** \`launchctl unload ${plistPath}\`
- **Logs:** \`tail -f /tmp/job-search-mcp-poller.log\``;
}

function getLinuxInstructions(nodePath: string, pollScript: string, intervalHours: number): string {
  // Build cron schedule: "0 */6 * * *" for every 6 hours
  const cronSchedule = `0 */${intervalHours} * * *`;

  return `## Linux cron

### Add this entry to your crontab

Run \`crontab -e\` and add:

\`\`\`
${cronSchedule} ${nodePath} ${pollScript} 2>> /tmp/job-search-mcp-poller.log
\`\`\`

### Manage

- **View crontab:** \`crontab -l\`
- **Edit crontab:** \`crontab -e\`
- **Logs:** \`tail -f /tmp/job-search-mcp-poller.log\``;
}
