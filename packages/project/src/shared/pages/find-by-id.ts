import { type Pages, type Page } from "../../db/types";

export const findById = (pages: Pages, pageId: string): Page | undefined => {
  if (pages.homePage.id === pageId) {
    return pages.homePage;
  }
  return pages.pages.find((page) => page.id === pageId);
};
