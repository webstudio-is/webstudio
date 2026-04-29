import {
  migratePages,
  serializePages as serializePagesData,
} from "@webstudio-is/project-migrations/pages";
import type { Pages } from "@webstudio-is/sdk";

export const parsePages = (pagesString: string): Pages => {
  return migratePages(JSON.parse(pagesString));
};

export const serializePages = (pages: Pages) => {
  return JSON.stringify(serializePagesData(pages));
};
