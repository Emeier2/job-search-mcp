import { spawn } from "node:child_process";

/**
 * Utility to call the Google Drive MCP server tools via stdio.
 */
export async function callGDriveTool(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const credentialsPath = "C:\\Users\\ethan\\.config\\mcp-gdrive\\gcp-oauth.keys.json";
    
    // Use the exact path to the installed npx package if possible, 
    // but npx -y should work if it's in the PATH.
    const child = spawn("npx", ["-y", "@piotr-agier/google-drive-mcp"], {
      env: {
        ...process.env,
        GOOGLE_DRIVE_OAUTH_CREDENTIALS: credentialsPath,
      },
      shell: true,
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        // The server often logs to stderr during startup, so only reject if we don't have valid JSON output
        try {
          const json = parseRpcResponse(output);
          if (json) return resolve(json);
        } catch (e) {
          // Fall through to error
        }
        return reject(new Error(`GDrive MCP exited with code ${code}. Stderr: ${errorOutput}`));
      }

      try {
        const json = parseRpcResponse(output);
        resolve(json);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        reject(new Error(`Failed to parse GDrive MCP output: ${msg}. Raw output: ${output}`));
      }
    });

    // Send the JSON-RPC request
    const request = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: method,
        arguments: params,
      },
      id: Date.now(),
    };

    child.stdin.write(JSON.stringify(request) + "\n");
    child.stdin.end();
  });
}

/**
 * Extract the JSON-RPC response from the server's stdout, 
 * skipping any "Starting server..." log messages.
 */
function parseRpcResponse(stdout: string): any {
  const lines = stdout.split("\n");
  for (const line of lines) {
    if (line.trim().startsWith('{"result":') || line.trim().startsWith('{"error":')) {
      return JSON.parse(line);
    }
  }
  return null;
}
