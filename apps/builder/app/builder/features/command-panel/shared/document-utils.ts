import { isPage, type Page, type PageTemplate } from "@webstudio-is/sdk";

// Only html documents accept arbitrary html element/component mutations
// (insertion, wrapping, conversion). xml documents allow only specific xml
// components (handled per-item where applicable) and text documents serve
// plain text content with no insertions.
export const allowsHtmlMutations = (page: Page | PageTemplate | undefined) => {
  if (page !== undefined && !isPage(page)) {
    return false;
  }
  const documentType = page?.meta.documentType;
  return documentType === undefined || documentType === "html";
};
