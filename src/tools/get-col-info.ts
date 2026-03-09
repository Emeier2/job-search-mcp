import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  lookupCol,
  compareCol,
  salaryEquivalent,
  searchMetros,
  getAllMetrosSorted,
  RPP_DATA_YEAR,
  RPP_NATIONAL_AVERAGE,
  RPP_BASELINE,
} from "../data/col-lookup.js";
import { loadPreferences } from "../utils/preferences.js";

export function registerGetColInfo(server: McpServer) {
  server.registerTool(
    "get_col_info",
    {
      description:
        "Cost-of-living lookup using BEA Regional Price Parity (RPP) data for ~120 U.S. metros. " +
        "Three modes: (1) 'lookup' — single city COL index + salary equivalencies. " +
        "(2) 'compare' — side-by-side comparison of two cities. " +
        "(3) 'equivalency' — what a specific salary in one city is worth in another. " +
        "All data from BEA RPP " + RPP_DATA_YEAR + " (national average = 100).",
      inputSchema: {
        mode: z
          .enum(["lookup", "compare", "equivalency"])
          .describe("Query mode"),
        city: z
          .string()
          .optional()
          .describe("City name for lookup, or 'from' city for equivalency (e.g., 'Austin', 'San Francisco')"),
        city2: z
          .string()
          .optional()
          .describe("Second city for compare, or 'to' city for equivalency"),
        salary: z
          .number()
          .optional()
          .describe("Salary amount for equivalency mode (e.g., 180000)"),
      },
    },
    async ({ mode, city, city2, salary }) => {
      const prefs = loadPreferences();
      const userFloor = prefs?.salary_min ?? 0;

      let text: string;

      switch (mode) {
        case "lookup": {
          if (!city) {
            // Show all metros ranked
            const all = getAllMetrosSorted();
            text = `# Cost of Living Index — All Metros\n\n`;
            text += `_Source: BEA Regional Price Parities, ${RPP_DATA_YEAR} | National average = ${RPP_NATIONAL_AVERAGE}_\n\n`;
            text += `| Rank | Metro | RPP | Scorer Multiplier |\n`;
            text += `|------|-------|-----|-------------------|\n`;
            all.forEach((entry, i) => {
              const mult = (entry.rpp / RPP_BASELINE).toFixed(3);
              text += `| ${i + 1} | ${entry.msa} | ${entry.rpp} | ${mult} |\n`;
            });
            if (userFloor > 0) {
              text += `\n_Your salary floor ($${userFloor.toLocaleString()}) is adjusted by the scorer multiplier for each location._\n`;
            }
            break;
          }

          const matches = searchMetros(city);
          if (matches.length === 0) {
            text = `# COL Lookup: "${city}"\n\nNo matching metro found. The scorer uses default multiplier (0.85).\nUse lookup mode without a city to see all metros.`;
            break;
          }

          if (matches.length === 1) {
            const entry = matches[0];
            const col = lookupCol(city);
            text = `# COL Lookup: ${entry.msa}\n\n`;
            text += `| Metric | Value |\n|--------|-------|\n`;
            text += `| **RPP Index** | ${entry.rpp} (national avg = ${RPP_NATIONAL_AVERAGE}) |\n`;
            text += `| **Relative to National** | ${entry.rpp > RPP_NATIONAL_AVERAGE ? "+" : ""}${(entry.rpp - RPP_NATIONAL_AVERAGE).toFixed(1)}% |\n`;
            text += `| **Scorer Multiplier** | ${col.multiplier.toFixed(3)} |\n`;

            if (userFloor > 0) {
              const adjustedFloor = Math.round(userFloor * col.multiplier);
              text += `| **Your Adjusted Floor** | $${adjustedFloor.toLocaleString()} (from $${userFloor.toLocaleString()}) |\n`;
            }

            // Show equivalencies to reference cities
            text += `\n## Salary Equivalencies\n\n`;
            const refSalary = userFloor > 0 ? userFloor : 160000;
            const refs = ["San Francisco", "New York", "Seattle", "Austin", "Salt Lake City"];
            text += `| $${refSalary.toLocaleString()} in ${city} = | Equivalent |\n|---|---|\n`;
            for (const ref of refs) {
              if (ref.toLowerCase() === city.toLowerCase()) continue;
              const equiv = salaryEquivalent(refSalary, city, ref);
              text += `| ${ref} | $${equiv.toLocaleString()} |\n`;
            }
            text += `\n_Source: BEA Regional Price Parities, ${RPP_DATA_YEAR}_`;
          } else {
            text = `# COL Lookup: "${city}" — ${matches.length} matches\n\n`;
            text += `| Metro | RPP | Multiplier |\n|-------|-----|------------|\n`;
            for (const entry of matches) {
              text += `| ${entry.msa} | ${entry.rpp} | ${(entry.rpp / RPP_BASELINE).toFixed(3)} |\n`;
            }
            text += `\nRefine your query for detailed info.`;
          }
          break;
        }

        case "compare": {
          if (!city || !city2) {
            text = `# COL Compare\n\nProvide both \`city\` and \`city2\` parameters.`;
            break;
          }

          const comparison = compareCol(city, city2);
          text = `# COL Comparison: ${city} vs ${city2}\n\n`;
          text += `| Metric | ${city} | ${city2} |\n`;
          text += `|--------|---|---|\n`;
          text += `| **MSA** | ${comparison.city1.msa || "Not found"} | ${comparison.city2.msa || "Not found"} |\n`;
          text += `| **RPP** | ${comparison.city1.rpp ?? "N/A"} | ${comparison.city2.rpp ?? "N/A"} |\n`;
          text += `| **Multiplier** | ${comparison.city1.multiplier.toFixed(3)} | ${comparison.city2.multiplier.toFixed(3)} |\n`;

          const diff = comparison.relativeDifference;
          text += `\n**${city2}** is **${diff > 0 ? `${diff.toFixed(1)}% more expensive` : `${Math.abs(diff).toFixed(1)}% less expensive`}** than ${city}.\n`;

          text += `\n## Salary Equivalencies\n\n`;
          text += `| Salary in ${city} | Equivalent in ${city2} |\n|---|---|\n`;
          for (const amt of [100000, 150000, 200000, 250000, 300000]) {
            const equiv = comparison.salaryEquivalent(amt);
            text += `| $${amt.toLocaleString()} | $${equiv.toLocaleString()} |\n`;
          }

          if (userFloor > 0) {
            text += `\n**Your salary floor:** $${userFloor.toLocaleString()}\n`;
            text += `- Adjusted for ${city}: $${Math.round(userFloor * comparison.city1.multiplier).toLocaleString()}\n`;
            text += `- Adjusted for ${city2}: $${Math.round(userFloor * comparison.city2.multiplier).toLocaleString()}\n`;
          }
          text += `\n_Source: BEA Regional Price Parities, ${RPP_DATA_YEAR}_`;
          break;
        }

        case "equivalency": {
          if (!city || !city2 || !salary) {
            text = `# Salary Equivalency\n\nProvide \`city\` (from), \`city2\` (to), and \`salary\` parameters.`;
            break;
          }

          const equiv = salaryEquivalent(salary, city, city2);
          const col1 = lookupCol(city);
          const col2 = lookupCol(city2);

          text = `# Salary Equivalency\n\n`;
          text += `**$${salary.toLocaleString()}** in **${city}** (RPP ${col1.rpp ?? "N/A"})`;
          text += ` = **$${equiv.toLocaleString()}** in **${city2}** (RPP ${col2.rpp ?? "N/A"})\n\n`;

          const d = equiv - salary;
          if (d > 0) text += `You would need **$${d.toLocaleString()} more** in ${city2} for the same purchasing power.\n`;
          else if (d < 0) text += `You would need **$${Math.abs(d).toLocaleString()} less** in ${city2} for the same purchasing power.\n`;
          else text += `Both cities have equivalent cost of living.\n`;

          text += `\n_Source: BEA Regional Price Parities, ${RPP_DATA_YEAR}_`;
          break;
        }

        default:
          text = `Unknown mode: "${mode}". Use "lookup", "compare", or "equivalency".`;
      }

      return { content: [{ type: "text" as const, text }] };
    }
  );
}

