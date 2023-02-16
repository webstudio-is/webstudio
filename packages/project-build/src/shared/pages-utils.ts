import type { Pages, Page } from "../schema/pages";

export const findPageByIdOrPath = (
  pages: Pages,
  idOrPath: string
): Page | undefined => {
  if (idOrPath === "" || idOrPath === "/" || idOrPath === pages.homePage.id) {
    return pages.homePage;
  }
  return pages.pages.find(
    (page) => page.path === idOrPath || page.id === idOrPath
  );
};
