import type { Pages, Page, Folder } from "@webstudio-is/sdk";
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

export const rootFolder = {
  id: "root",
  name: "Root",
  slug: "",
  children: [],
} satisfies Folder;

export const createDefaultPages = ({
  rootInstanceId,
  homePageId = nanoid(),
}: {
  rootInstanceId: string;
  homePageId?: string;
}): Pages => {
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
      ...rootFolder,
      children: [homePageId],
    },
    pages: [],
    folders: [],
  };
};
