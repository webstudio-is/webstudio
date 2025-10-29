import { json } from "@remix-run/server-runtime";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { isBuilder } from "../router-utils";

/**
 * System Resource that provides browser/client information from request headers.
 * Includes user agent, accepted languages, and other client-side data.
 */
export const loader = async ({ request }: { request: Request }) => {
  if (isBuilder(request) === false) {
    throw new Error("Only builder requests are allowed");
  }

  const { projectId } = parseBuilderUrl(request.url);

  if (projectId === undefined) {
    throw new Error("projectId is required");
  }

  const headers = request.headers;

  // Parse Accept-Language header to get preferred languages
  const acceptLanguage = headers.get("Accept-Language") || "";
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, q] = lang.trim().split(";q=");
      return {
        code: code.trim(),
        quality: q ? parseFloat(q) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality)
    .map((lang) => lang.code);

  return json({
    userAgent: headers.get("User-Agent") || "",
    language: languages[0] || "",
    languages,
    acceptLanguage,
    referer: headers.get("Referer") || "",
    // Note: Screen size, timezone, etc. are not available server-side
    // These would need to be set client-side if needed
  });
};
