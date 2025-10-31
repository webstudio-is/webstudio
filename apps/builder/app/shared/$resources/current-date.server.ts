import { json } from "@remix-run/server-runtime";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { isBuilder } from "../router-utils";

/**
 * System Resource that provides current date information.
 * This prevents React hydration errors when displaying dynamic dates
 * (e.g., copyright years in footers) by ensuring server and client
 * render the same date.
 *
 * All values are normalized to midnight UTC (00:00:00.000Z) to ensure
 * consistency throughout the entire day, preventing hydration mismatches.
 */
export const loader = async ({ request }: { request: Request }) => {
  if (isBuilder(request) === false) {
    throw new Error("Only builder requests are allowed");
  }

  const { projectId } = parseBuilderUrl(request.url);

  if (projectId === undefined) {
    throw new Error("projectId is required");
  }

  const now = new Date();

  // Normalize to midnight UTC to prevent hydration mismatches
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  return json({
    iso: startOfDay.toISOString(),
    year: startOfDay.getUTCFullYear(),
    month: startOfDay.getUTCMonth() + 1, // 1-12 instead of 0-11
    day: startOfDay.getUTCDate(),
    timestamp: startOfDay.getTime(),
  });
};
