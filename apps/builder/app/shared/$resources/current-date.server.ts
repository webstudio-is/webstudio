import { json } from "@remix-run/server-runtime";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { isBuilder } from "../router-utils";

/**
 * System Resource that provides current date/time information.
 * This prevents React hydration errors when displaying dynamic dates
 * (e.g., copyright years in footers) by ensuring server and client
 * render the same timestamp.
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

  return json({
    iso: now.toISOString(),
    year: now.getFullYear(),
    month: now.getMonth() + 1, // 1-12 instead of 0-11
    day: now.getDate(),
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
    timestamp: now.getTime(),
  });
};
