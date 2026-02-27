import type { JobSource } from "../types.js";
import { greenhouse } from "./greenhouse.js";
import { lever } from "./lever.js";
import { ashby } from "./ashby.js";

const sources: Record<string, JobSource> = {
  greenhouse,
  lever,
  ashby,
};

/**
 * Get a job source by platform name.
 * Priority order: Greenhouse > Lever > Ashby
 */
export function getSource(platform: string): JobSource | undefined {
  return sources[platform.toLowerCase()];
}

/**
 * Get all registered sources in priority order.
 */
export function getAllSources(): JobSource[] {
  return [greenhouse, lever, ashby];
}

/**
 * All platform names.
 */
export const PLATFORMS = ["greenhouse", "lever", "ashby"] as const;

export const PLATFORM_PRIORITY: Record<string, number> = {
  greenhouse: 0, lever: 1, ashby: 2,
};

export const PLATFORM_BONUS: Record<string, number> = {
  greenhouse: 3, lever: 1, ashby: 0,
};
