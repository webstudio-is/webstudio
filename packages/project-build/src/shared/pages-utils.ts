import type { Pages, Page, Folder } from "@webstudio-is/sdk";

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

// This is a root folder that nobody can delete or going to be able to see.
export const createRootFolder = (children: Folder["children"] = []): Folder => {
  return {
    id: "root",
    name: "Root",
    slug: "",
    children,
  };
};
