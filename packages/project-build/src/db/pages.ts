import type { Pages } from "../schema/pages";

export const parsePages = (pagesString: string): Pages => {
  return JSON.parse(pagesString) as Pages;
};

export const serializePages = (pages: Pages) => {
  return JSON.stringify(pages);
};
