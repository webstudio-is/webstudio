import { Pages } from "../schema/pages";

export const parsePages = (
  pagesString: string,
  skipValidation = false
): Pages => {
  return skipValidation
    ? (JSON.parse(pagesString) as Pages)
    : Pages.parse(JSON.parse(pagesString));
};

export const serializePages = (pages: Pages) => {
  return JSON.stringify(pages);
};
