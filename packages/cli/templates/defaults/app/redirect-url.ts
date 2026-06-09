import { createPath, generatePath, parsePath } from "@remix-run/react";

/**
 * Expands route params in local redirect targets.
 * External and protocol-relative URLs are returned unchanged because route params
 * only apply to app paths.
 */
export const generateRedirectUrl = (
  url: string,
  params: Record<string, string | undefined>
) => {
  if (url.startsWith("/") === false || url.startsWith("//")) {
    return url;
  }

  const path = parsePath(url);
  return createPath({
    ...path,
    pathname: generatePath(path.pathname ?? "/", params),
  });
};
