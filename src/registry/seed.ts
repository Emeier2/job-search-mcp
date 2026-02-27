/**
 * Curated seed list of company slugs across Greenhouse, Lever, and Ashby.
 * Used by run_setup to discover which companies have active job boards.
 * Slugs are the URL identifier each ATS uses for the company's careers page.
 *
 * Slugs verified 2026-02-26 against live APIs.
 */

export interface SeedEntry {
  slug: string;
  ats: "greenhouse" | "lever" | "ashby";
}

export const SEED_LIST: SeedEntry[] = [
  // ── Greenhouse ──────────────────────────────────────
  // AI & AI Infrastructure
  { slug: "anthropic", ats: "greenhouse" },

  // Developer Tools & Infrastructure
  { slug: "stripe", ats: "greenhouse" },
  { slug: "vercel", ats: "greenhouse" },
  { slug: "gitlab", ats: "greenhouse" },
  { slug: "postman", ats: "greenhouse" },
  { slug: "sourcegraph91", ats: "greenhouse" },
  { slug: "webflow", ats: "greenhouse" },
  { slug: "temporal", ats: "greenhouse" },
  { slug: "launchdarkly", ats: "greenhouse" },
  { slug: "grafanalabs", ats: "greenhouse" },
  { slug: "dbtlabsinc", ats: "greenhouse" },

  // Cloud & Data
  { slug: "databricks", ats: "greenhouse" },
  { slug: "cloudflare", ats: "greenhouse" },
  { slug: "datadog", ats: "greenhouse" },
  { slug: "elastic", ats: "greenhouse" },
  { slug: "coreweave", ats: "greenhouse" },
  { slug: "cockroachlabs", ats: "greenhouse" },
  { slug: "amplitude", ats: "greenhouse" },
  { slug: "twilio", ats: "greenhouse" },
  { slug: "pagerduty", ats: "greenhouse" },
  { slug: "samsara", ats: "greenhouse" },
  { slug: "lattice", ats: "greenhouse" },

  // Consumer & Fintech
  { slug: "airbnb", ats: "greenhouse" },
  { slug: "coinbase", ats: "greenhouse" },
  { slug: "figma", ats: "greenhouse" },
  { slug: "airtable", ats: "greenhouse" },
  { slug: "discord", ats: "greenhouse" },
  { slug: "duolingo", ats: "greenhouse" },
  { slug: "gusto", ats: "greenhouse" },
  { slug: "flexport", ats: "greenhouse" },
  { slug: "brex", ats: "greenhouse" },
  { slug: "robinhood", ats: "greenhouse" },
  { slug: "scaleai", ats: "greenhouse" },
  { slug: "verkada", ats: "greenhouse" },

  // Corrected slugs (old name or alternate form)
  { slug: "tripactions", ats: "greenhouse" },      // Navan
  { slug: "andurilindustries", ats: "greenhouse" }, // Anduril

  // ── Lever ───────────────────────────────────────────
  { slug: "spotify", ats: "lever" },
  { slug: "netflix", ats: "lever" },
  { slug: "plaid", ats: "lever" },
  { slug: "mistral", ats: "lever" },
  { slug: "neon", ats: "lever" },
  { slug: "anyscale", ats: "lever" },
  { slug: "figma", ats: "lever" },
  { slug: "reddit", ats: "lever" },
  { slug: "tailscale", ats: "lever" },
  { slug: "fly", ats: "lever" },
  { slug: "planetscale", ats: "lever" },
  { slug: "render", ats: "lever" },
  { slug: "railway", ats: "lever" },
  { slug: "replit", ats: "lever" },
  { slug: "deno", ats: "lever" },
  { slug: "netlify", ats: "lever" },
  { slug: "temporal-technologies", ats: "lever" },
  { slug: "prefect", ats: "lever" },
  { slug: "dagster", ats: "lever" },
  { slug: "airbyte", ats: "lever" },
  { slug: "fivetran", ats: "lever" },
  { slug: "materialize", ats: "lever" },
  { slug: "stytch", ats: "lever" },
  { slug: "hex", ats: "lever" },
  { slug: "prisma", ats: "lever" },
  { slug: "pulumi", ats: "lever" },
  { slug: "miro", ats: "lever" },
  { slug: "coda", ats: "lever" },
  { slug: "loom", ats: "lever" },
  { slug: "mercury", ats: "lever" },
  { slug: "pipe", ats: "lever" },
  { slug: "superhuman", ats: "lever" },
  { slug: "resend", ats: "lever" },
  { slug: "axiom-co", ats: "lever" },
  { slug: "turso", ats: "lever" },
  { slug: "convex", ats: "lever" },
  { slug: "replicate", ats: "lever" },
  { slug: "huggingface", ats: "lever" },
  { slug: "cohere", ats: "lever" },
  { slug: "weights-and-biases", ats: "lever" },
  { slug: "together-ai", ats: "lever" },
  { slug: "perplexity-ai", ats: "lever" },
  { slug: "cursor", ats: "lever" },
  { slug: "modal", ats: "lever" },
  { slug: "langchain", ats: "lever" },

  // ── Ashby ───────────────────────────────────────────
  // Companies that migrated from Greenhouse to Ashby
  { slug: "openai", ats: "ashby" },
  { slug: "notion", ats: "ashby" },
  { slug: "vanta", ats: "ashby" },
  { slug: "ramp", ats: "ashby" },
  { slug: "retool", ats: "ashby" },
  { slug: "zapier", ats: "ashby" },
  { slug: "mux", ats: "ashby" },
  { slug: "linear", ats: "ashby" },
  { slug: "snyk", ats: "ashby" },
  { slug: "watershed", ats: "ashby" },

  // AI companies on Ashby
  { slug: "cohere", ats: "ashby" },
  { slug: "perplexity", ats: "ashby" },
  { slug: "cursor", ats: "ashby" },
  { slug: "langchain", ats: "ashby" },
  { slug: "modal", ats: "ashby" },
  { slug: "pinecone", ats: "ashby" },
  { slug: "weaviate", ats: "ashby" },
  { slug: "cerebras", ats: "ashby" },
  { slug: "groq", ats: "ashby" },
  { slug: "stability-ai", ats: "ashby" },
  { slug: "pika", ats: "ashby" },
  { slug: "runway", ats: "ashby" },
  { slug: "poolside", ats: "ashby" },
  { slug: "eleven-labs", ats: "ashby" },
  { slug: "ai21labs", ats: "ashby" },
  { slug: "character-ai", ats: "ashby" },
  { slug: "inflection-ai", ats: "ashby" },
  { slug: "adept", ats: "ashby" },
  { slug: "midjourney", ats: "ashby" },
  { slug: "glean", ats: "ashby" },
  { slug: "arcee-ai", ats: "ashby" },
  { slug: "magic-dev", ats: "ashby" },
  { slug: "fireworks-ai", ats: "ashby" },
  { slug: "baseten", ats: "ashby" },

  // Developer tools on Ashby
  { slug: "vercel", ats: "ashby" },
  { slug: "supabase", ats: "ashby" },
  { slug: "replit", ats: "ashby" },
  { slug: "confluent", ats: "ashby" },
  { slug: "clerk", ats: "ashby" },
  { slug: "resend", ats: "ashby" },
  { slug: "inngest", ats: "ashby" },
  { slug: "neon", ats: "ashby" },
  { slug: "raycast", ats: "ashby" },
  { slug: "mintlify", ats: "ashby" },
  { slug: "tinybird", ats: "ashby" },
  { slug: "highlight", ats: "ashby" },
  { slug: "knock", ats: "ashby" },
  { slug: "trigger", ats: "ashby" },
  { slug: "cal", ats: "ashby" },
  { slug: "dagger", ats: "ashby" },
  { slug: "val-town", ats: "ashby" },
  { slug: "railway", ats: "ashby" },
  { slug: "render", ats: "ashby" },
];
