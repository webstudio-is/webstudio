import { rawTheme, theme, type CSS } from "@webstudio-is/design-system";
import { getPagePath, type Pages } from "@webstudio-is/sdk";

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
