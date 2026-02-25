import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getJob, getCompany, getJobsByDepartment } from "../db/cache.js";

export function registerGetResumeContext(server: McpServer) {
  server.registerTool(
    "get_resume_context",
    {
      description:
        "Returns everything the LLM needs to customize a resume for a specific job. Includes full job description, required/preferred qualifications, company mission/values, culture keywords, other roles in the same department, and preference score breakdown. All data is read from SQLite — zero API calls.",
      inputSchema: {
        source: z.string().describe("ATS platform (e.g., 'greenhouse', 'lever', 'ashby')"),
        company: z.string().describe("Company slug (e.g., 'anthropic')"),
        job_id: z.string().describe("External job ID from the ATS"),
      },
    },
    async ({ source, company, job_id }) => {
      let job = await getJob(source, `${source}:${company}`, job_id);
      if (!job) {
        job = await getJob(source, company, job_id);
      }

      if (!job) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Job not found: ${source}/${company}/${job_id}. Make sure the poller has run and the IDs are correct.`,
            },
          ],
        };
      }

      const companyMeta = await getCompany(job.company_id);

      // Get other roles in the same department for positioning context
      let departmentRoles: string[] = [];
      if (job.department) {
        const deptJobs = await getJobsByDepartment(job.company_id, job.department);
        departmentRoles = deptJobs
          .filter((j) => j.id !== job!.id)
          .slice(0, 10)
          .map((j) => `- ${j.title} (score: ${j.score})`);
      }

      // Extract sections from description for resume targeting
      const descText = job.description_text || "";
      const qualifications = extractSection(descText, [
        "qualifications",
        "requirements",
        "what you'll need",
        "what we're looking for",
        "must have",
        "required",
      ]);
      const niceToHave = extractSection(descText, [
        "nice to have",
        "preferred",
        "bonus",
        "plus",
        "ideal",
      ]);
      const techStack = extractTechKeywords(descText);

      const salary =
        job.salary_min && job.salary_max
          ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()} ${job.salary_currency}`
          : "Not listed";

      const breakdown = job.score_breakdown
        ? Object.entries(job.score_breakdown)
            .map(([k, v]) => `- ${k}: +${v}`)
            .join("\n")
        : "No breakdown available";

      let text = `# Resume Context: ${job.title}

## Job Details
- **Title:** ${job.title}
- **Company:** ${companyMeta?.name || job.company_id}
- **Department:** ${job.department || "Not specified"}
- **Location:** ${job.location || "Not specified"}
- **Salary:** ${salary}
- **Apply:** ${job.application_url || "N/A"}
- **Score:** ${job.score}
- **Tags:** ${job.tags.join(", ") || "None"}

## Score Breakdown (your keyword matches)
${breakdown}

## Full Job Description
${descText || "Not available"}

## Extracted: Required Qualifications
${qualifications || "Could not extract — review full description above"}

## Extracted: Nice-to-Have / Preferred
${niceToHave || "Could not extract — review full description above"}

## Detected Tech Stack / Skills
${techStack.length > 0 ? techStack.join(", ") : "None detected — review full description above"}
`;

      if (companyMeta) {
        text += `
## Company Context
- **Name:** ${companyMeta.name}
- **Description:** ${companyMeta.description || "Not available"}
- **Mission/Values:** ${companyMeta.mission_values || "Not available"}
- **Industry:** ${companyMeta.industry || "Unknown"}
- **Funding Stage:** ${companyMeta.funding_stage || "Unknown"}
- **Culture Keywords:** ${companyMeta.culture_keywords?.join(", ") || "Not available"}
- **Careers URL:** ${companyMeta.careers_url}
`;
      }

      if (departmentRoles.length > 0) {
        text += `
## Other Roles in ${job.department} Department
${departmentRoles.join("\n")}
`;
      }

      return { content: [{ type: "text" as const, text }] };
    }
  );
}

/**
 * Extract a section from JD text based on header keywords.
 */
function extractSection(text: string, headers: string[]): string | null {
  const lines = text.split("\n");
  let capturing = false;
  const captured: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase().trim();

    if (headers.some((h) => lower.includes(h))) {
      capturing = true;
      continue;
    }

    if (capturing) {
      // Stop at the next section header (line that looks like a header)
      if (
        lower.length > 0 &&
        lower.length < 80 &&
        !lower.startsWith("-") &&
        !lower.startsWith("•") &&
        !lower.startsWith("*") &&
        lower.endsWith(":") &&
        captured.length > 0
      ) {
        break;
      }
      if (line.trim()) {
        captured.push(line.trim());
      }
    }
  }

  return captured.length > 0 ? captured.join("\n") : null;
}

/**
 * Extract technology/skill keywords from JD text.
 */
function extractTechKeywords(text: string): string[] {
  const techPatterns = [
    "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "C\\+\\+", "C#",
    "Ruby", "Kotlin", "Swift", "Scala", "PHP",
    "React", "Vue", "Angular", "Next\\.js", "Node\\.js", "Express", "FastAPI",
    "Django", "Flask", "Spring",
    "AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "DynamoDB", "SQLite",
    "GraphQL", "REST", "gRPC", "WebSocket",
    "CI/CD", "GitHub Actions", "Jenkins", "CircleCI",
    "Machine Learning", "Deep Learning", "NLP", "LLM", "RAG",
    "MCP", "SDK", "API", "CLI",
    "TensorFlow", "PyTorch", "Hugging Face",
  ];

  const found = new Set<string>();
  for (const pattern of techPatterns) {
    const regex = new RegExp(`\\b${pattern}\\b`, "i");
    if (regex.test(text)) {
      // Use the canonical casing from our pattern list
      found.add(pattern.replace(/\\\./g, ".").replace(/\\\+/g, "+"));
    }
  }

  return [...found].sort();
}
