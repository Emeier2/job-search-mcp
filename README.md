# job-search-mcp

MCP server that bulk-polls ATS job boards, scores jobs against your preferences, and surfaces matches. Designed for use with Claude Code or any MCP-compatible client.

The LLM's role is limited to two things: (1) a one-time interview to define your preferences, and (2) presenting pre-filtered results. Everything else — fetching, storing, scoring, filtering — runs locally.

## How it works

```
preferences.json ─► poller (cron) ─► ATS APIs ─► scorer ─► SQLite
                                                              │
                                          MCP client ◄── query tools
                                                              │
                                        Google Drive ◄── resume tools
```

1. **Setup** — `run_setup` probes ~150 company slugs across Greenhouse, Lever, and Ashby to discover active job boards.
2. **Interview** — The LLM interviews you about role preferences, then calls `save_preferences` to write `preferences.json`.
3. **Poll** — A background poller (`node build/poll.js`) fetches all jobs from tracked companies and scores them deterministically.
4. **Query** — MCP tools read pre-scored results from SQLite. Zero API calls at query time.
5. **Organize** — `generate_resumes` copies your base resume into company-specific folders on Google Drive for top matches.

### Design principles

- **LLM credits are expensive** — used only for the preference interview and result presentation
- **Local compute is free** — keyword scoring, search, and filtering all happen in SQLite and Node.js
- **Network is cheap** — bulk-fetch thousands of jobs from public ATS APIs on a schedule
- **User controls everything** — company list, keyword weights, scoring thresholds all come from the interview

## Scoring engine

Pure string matching — no LLM calls in the scoring loop.

| Rule | Logic |
|---|---|
| Exclusion check | If any exclusion term appears in job title → disqualified (score = -1) |
| Salary floor (COL-adjusted) | `salary_min × COL_multiplier`. Multiplier = `Local_RPP / 122.3 (NYC)`. |
| Title keywords | Substring match against job title, each hit adds its configured weight |
| Description keywords | Substring match against plain-text job description, each hit adds its weight |
| Location bonus | +2 if job location matches a preferred location |
| Platform bonus | Greenhouse +3, Lever +1, Ashby +0 |

Jobs below `score_threshold` (default: 5) are stored but not surfaced by `get_matches`.

### Cost-of-Living (COL) Adjustment

The salary check dynamically adjusts your minimum acceptable salary based on job location using **BEA Regional Price Parity (RPP)** data for ~120 U.S. metros.

A `salary_min` of $160,000 in your preferences translates to:

| Location | RPP | Multiplier | Effective floor |
|---|---|---|---|
| New York City | 122.3 | 1.000 | $160,000 |
| San Francisco | 118.5 | 0.969 | $155,040 |
| Seattle | 112.9 | 0.923 | $147,680 |
| Austin | 103.8 | 0.849 | $135,840 |
| Salt Lake City | 101.2 | 0.827 | $132,320 |
| Remote | N/A | 0.900 | $144,000 |
| Unknown / other | N/A | 0.850 | $136,000 |

This ensures roles in lower-cost areas aren't filtered out by a floor calibrated to high-COL hubs.

## MCP tools

### Setup & Config
| Tool | Description |
|---|---|
| `run_setup` | Probe seed list + optional extras to discover companies with active boards |
| `get_company_info` | Company metadata: name, description, departments, locations, open role count |
| `save_preferences` | Write structured preference profile (keywords, exclusions, locations, salary) |
| `setup_polling` | Returns OS-specific instructions for scheduling the poller |
| `get_col_info` | Lookup, compare, or calculate salary equivalencies for 120+ U.S. metros |

### Query & Action
| Tool | Description |
|---|---|
| `get_matches` | Top-scoring jobs above threshold. Filters: company, location, days, limit |
| `list_company_jobs` | All open positions at one company, sorted by score |
| `get_job_details` | Full job description, salary, score breakdown, and **COL purchasing power context** |
| `get_resume_context` | Job + company context bundle for resume customization |
| `search_jobs` | Full-text keyword search across all cached jobs |
| `check_job_status` | HTTP HEAD to verify a posting URL is still live |
| `generate_resumes` | Copies base resume into company folders on GDrive for top matches |

## Google Drive Integration

The `generate_resumes` tool automates the first step of the application pipeline. It:
1. Identifies top-scoring job matches.
2. Connects to Google Drive (via `@piotr-agier/google-drive-mcp`).
3. Creates a company-specific folder if one doesn't exist.
4. Copies your "base resume" (specified by ID) into that folder, renamed for the specific role.

This prepares a workspace for you to perform final role-specific resume tweaks.

## ATS sources

| Platform | API |
|---|---|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{slug}` |
| Lever | `api.lever.co/v0/postings/{slug}` |
| Ashby | `api.ashbyhq.com/posting-api` |

## Project structure

```
src/
├── index.ts              # MCP server entry point (stdio transport)
├── poll.ts               # Background poller (standalone)
├── types.ts              # TypeScript interfaces
├── data/
│   ├── rpp-data.ts       # BEA Regional Price Parity raw data
│   └── col-lookup.ts     # Multiplier and equivalency logic
├── scoring/
│   └── scorer.ts         # Deterministic scoring engine with COL adjustment
├── sources/
│   ├── registry.ts       # ATS source dispatch + platform bonuses
│   ├── greenhouse.ts     # Greenhouse adapter
│   ├── lever.ts          # Lever adapter
│   └── ashby.ts          # Ashby adapter
├── db/
│   ├── schema.ts         # SQLite schema (sql.js)
│   ├── cache.ts          # Upsert, query, mark-dead operations
│   └── search.ts         # LIKE-based full-text search
├── tools/                # One file per MCP tool registration
│   ├── run-setup.ts
│   ├── save-preferences.ts
│   ├── setup-polling.ts
│   ├── get-matches.ts
│   ├── list-company-jobs.ts
│   ├── get-job-details.ts
│   ├── get-resume-context.ts
│   ├── search-jobs.ts
│   ├── check-job-status.ts
│   ├── get-company-info.ts
│   ├── get-col-info.ts      # New: COL lookup and salary comparison
│   └── generate-resumes.ts  # New: Google Drive resume automation
└── utils/
    ├── preferences.ts    # Load/save preferences.json
    ├── salary-parser.ts  # Regex salary extraction
    ├── html-to-text.ts   # HTML → plain text
    └── gdrive.ts         # GDrive MCP bridge utility
```

## Quick start

```bash
npm install
npm run build

# Run the MCP server (stdio)
npm start

# Poll manually
npm run poll
```

### MCP client config

```json
{
  "mcpServers": {
    "job-search": {
      "command": "node",
      "args": ["build/index.js"],
      "cwd": "/path/to/job-search-mcp"
    }
  }
}
```

## Tech stack

- TypeScript + Node.js
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [sql.js](https://github.com/sql-js/sql.js) (SQLite in WASM)
- [Zod](https://github.com/colinhacks/zod)

## License

MIT
