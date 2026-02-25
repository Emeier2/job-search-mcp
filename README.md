# job-search-mcp

MCP server that bulk-polls job boards, scores jobs against your personal preferences, and surfaces matches — all with minimal LLM credit usage.

The LLM's role is limited to two things: (1) a one-time interview to define your preferences, and (2) presenting pre-filtered results. Everything else — fetching, storing, scoring, filtering — runs locally.

## How It Works

```
Discovery (no LLM)     →  Probe ~150 companies across Greenhouse, Lever, Ashby
Interview (LLM)         →  Define roles, skills, locations, salary, exclusions
Background Polling      →  OS scheduler fetches & scores jobs on a cron
Query (minimal LLM)     →  Pre-scored results from SQLite, LLM just summarizes
```

### Design Principles

- **LLM credits are expensive** — used only for the preference interview and result presentation
- **Local compute is free** — keyword scoring, search, and filtering all happen in SQLite and Node.js
- **Network is cheap** — bulk-fetch thousands of jobs from public ATS APIs on a schedule
- **User controls everything** — company list, keyword weights, scoring thresholds all come from the interview

## MCP Tools

| Tool | Phase | Purpose |
|------|-------|---------|
| `run_setup` | Setup | Discover companies across Greenhouse/Lever/Ashby, return interview guide |
| `get_company_info` | Setup | Drill into a specific company's metadata |
| `save_preferences` | Setup | Write preference profile to disk |
| `setup_polling` | Setup | Detect OS, generate scheduler setup instructions |
| `get_matches` | Query | Top-scoring jobs above threshold |
| `list_company_jobs` | Query | All open positions at one company |
| `get_job_details` | Query | Full description for a single posting |
| `get_resume_context` | Query | Full job + company data package for resume customization |
| `search_jobs` | Query | Keyword search across all cached jobs |
| `check_job_status` | Query | Verify if a posting URL is still live |

## Scoring Engine

All scoring is pure string matching and arithmetic — zero LLM calls:

1. **Title keyword matches** — weighted terms matched against job title
2. **Description keyword matches** — weighted terms matched against job description
3. **Exclusion penalty** — disqualifies jobs with excluded terms in title (score = -1)
4. **Location bonus** — +2 for matching preferred locations
5. **Salary floor** — disqualifies jobs below minimum salary (score = -1)

## Quick Start

```bash
npm install
npm run build
```

### Setup

In Claude Code, ask: *"Set me up for job searching"*

This triggers `run_setup` → company discovery → preference interview → `save_preferences` → `setup_polling`.

### Manual Poll

```bash
node build/poll.js
```

### Query

Ask Claude: *"Any new job matches?"* or *"Show me platform engineer roles"*

## Supported ATS Platforms

- **Greenhouse** — `boards-api.greenhouse.io` (public JSON API)
- **Lever** — `api.lever.co` (public postings API)
- **Ashby** — `api.ashbyhq.com` (public posting API)

## Tech

TypeScript · Node.js · MCP SDK · SQLite (sql.js) · Zod

## License

MIT
