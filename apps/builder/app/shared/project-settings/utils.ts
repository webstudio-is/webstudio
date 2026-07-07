import { rawTheme, theme, type CSS } from "@webstudio-is/design-system";
import {
  getAllPages,
  getPagePath,
  type Pages,
  type PageRedirect,
} from "@webstudio-is/sdk";
import { matchPath } from "@remix-run/react";
import {
  getRedirectSourcePathname,
  getRedirectSourceSearchIndex,
  normalizeRedirectSource,
} from "~/shared/redirects/redirect-source";

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

  for (const page of getAllPages(pages)) {
    if (page.id === pages.homePageId) {
      continue;
    }
    const pagePath = getPagePath(page.id, pages);
    if (pagePath === undefined) {
      continue;
    }
    paths.add(pagePath);
  }
  return paths;
};

export const doesRedirectSourceOverridePagePath = (
  redirectSource: string,
  pagePath: string
) => {
  const source = normalizeRedirectSource(redirectSource);
  if (getRedirectSourceSearchIndex(source) !== -1) {
    return false;
  }

  const sourcePathname = getRedirectSourcePathname(source);
  const normalizedPagePath = normalizeRedirectSource(pagePath);

  if (sourcePathname === normalizedPagePath) {
    return true;
  }

  return (
    matchPath(
      {
        path: normalizedPagePath,
        caseSensitive: true,
        end: true,
      },
      sourcePathname
    ) !== null ||
    matchPath(
      {
        path: sourcePathname,
        caseSensitive: true,
        end: true,
      },
      normalizedPagePath
    ) !== null
  );
};

/**
 * Find a redirect that would match the given page path.
 * Uses the same pattern matcher as published redirect runtime.
 */
export const findMatchingRedirect = (
  pagePath: string,
  redirects: Array<PageRedirect>
): PageRedirect | undefined => {
  for (const redirect of redirects) {
    if (doesRedirectSourceOverridePagePath(redirect.old, pagePath)) {
      return redirect;
    }
  }
};
