import type { Pages, Page } from "@webstudio-is/sdk";
import { nanoid } from "nanoid";

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

export const createDefaultPages = ({
  rootInstanceId,
}: {
  rootInstanceId: string;
}): Pages => {
  const homePageId = nanoid();
  return {
    meta: {},
    homePage: {
      id: homePageId,
      name: "Home",
      path: "",
      title: "Home",
      meta: {},
      rootInstanceId,
    },
    // This is a root folder that nobody can delete or going to be able to see.
    rootFolder: {
      id: "root",
      name: "Root",
      slug: "",
      children: [homePageId],
    },
    pages: [],
    folders: [],
  };
};
