import { nanoid } from "nanoid";
import {
  type Pages,
  type Folder,
  ROOT_FOLDER_ID,
  Instance,
  DataSource,
} from "@webstudio-is/sdk";

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
  systemDataSourceId,
  homePageId = nanoid(),
}: {
  rootInstanceId: Instance["id"];
  systemDataSourceId?: DataSource["id"];
  homePageId?: string;
}): Pages => {
  // This is a root folder that nobody can delete or going to be able to see.
  const rootFolder = createRootFolder([homePageId]);
  return {
    meta: {},
    homePage: {
      id: homePageId,
      name: "Home",
      path: "",
      title: `"Home"`,
      meta: {},
      rootInstanceId,
      systemDataSourceId,
    },
    pages: [],
    folders: [rootFolder],
  };
};
