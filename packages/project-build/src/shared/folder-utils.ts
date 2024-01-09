import type { Folder } from "@webstudio-is/sdk";

// This is a root folder that nobody can delete or going to be able to see.
export const createRootFolder = (children: Folder["children"] = []): Folder => {
  return {
    id: "root",
    name: "Root",
    slug: "",
    children,
  };
};
