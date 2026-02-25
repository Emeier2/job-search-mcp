import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Preferences } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const PREFS_PATH = join(PROJECT_ROOT, "preferences.json");

export function getPreferencesPath(): string {
  return PREFS_PATH;
}

export function loadPreferences(): Preferences | null {
  if (!existsSync(PREFS_PATH)) {
    return null;
  }
  const raw = readFileSync(PREFS_PATH, "utf-8");
  return JSON.parse(raw) as Preferences;
}

export function savePreferences(prefs: Preferences): void {
  writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2), "utf-8");
}
