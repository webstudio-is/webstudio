import { rawTheme, theme, type CSS } from "@webstudio-is/design-system";
import { getPagePath, type Pages, type PageRedirect } from "@webstudio-is/sdk";
import { matchPathnamePattern } from "~/builder/shared/url-pattern";

export const leftPanelWidth = rawTheme.spacing[26];
export const rightPanelWidth = rawTheme.spacing[35];
export const sectionSpacing: CSS = {
  paddingInline: theme.panel.paddingInline,
};

export const getExistingRoutePaths = (pages?: Pages): Set<string> => {
  const paths: Set<string> = new Set();
  if (pages === undefined) {
    return paths;
  }

  for (const page of pages.pages) {
    const pagePath = getPagePath(page.id, pages);
    if (pagePath === undefined) {
      continue;
    }
    paths.add(pagePath);
  }
  return paths;
};

/**
 * Find a redirect that would match the given page path.
 * Uses URLPattern for proper pattern matching (wildcards, dynamic segments).
 */
export const findMatchingRedirect = (
  pagePath: string,
  redirects: Array<PageRedirect>
): PageRedirect | undefined => {
  for (const redirect of redirects) {
    // matchPathnamePattern returns matched groups if pattern matches, undefined otherwise
    const match = matchPathnamePattern(redirect.old, pagePath);
    if (match !== undefined) {
      return redirect;
    }
  }
};
