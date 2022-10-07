import { type Pages, type Page } from "../../db/types";

export const findByPath = (
  pages: Pages,
  pagePath: string
): Page | undefined => {
  if (pagePath === "" || pagePath === "/") {
    return pages.homePage;
  }
  return pages.pages.find((page) => page.path === pagePath);
};
