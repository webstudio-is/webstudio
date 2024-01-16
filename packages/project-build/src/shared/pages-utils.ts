import type { Pages, Page, Folder } from "@webstudio-is/sdk";
import { nanoid } from "nanoid";

// @todo path needs to support folders now
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

export const ROOT_FOLDER_ID = "root";

export const createRootFolder = (
  children: Folder["children"] = []
): Folder => ({
  id: ROOT_FOLDER_ID,
  name: "Root",
  slug: "",
  children,
});

export const createDefaultPages = ({
  rootInstanceId,
  homePageId = nanoid(),
  homePagePath = "",
}: {
  rootInstanceId: string;
  homePageId?: string;
  homePagePath?: string;
}): Pages => {
  // This is a root folder that nobody can delete or going to be able to see.
  const rootFolder = createRootFolder([homePageId]);
  return {
    meta: {},
    homePage: {
      id: homePageId,
      name: "Home",
      path: homePagePath,
      title: "Home",
      meta: {},
      rootInstanceId,
    },
    pages: [],
    folders: [rootFolder],
  };
};
