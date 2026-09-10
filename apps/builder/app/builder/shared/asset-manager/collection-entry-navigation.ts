import { getPagePath, type Pages } from "@webstudio-is/sdk";
import { tokenizePathnamePattern } from "@webstudio-is/project-build/runtime";

export const getCollectionEntryCanvasTarget = ({
  entryPageId,
  entryBasename,
  pages,
}: {
  entryPageId: string | undefined;
  entryBasename: string;
  pages: Pages | undefined;
}) => {
  if (entryPageId === undefined || pages?.pages.has(entryPageId) !== true) {
    return;
  }
  const parameters = tokenizePathnamePattern(
    getPagePath(entryPageId, pages)
  ).filter((token) => token.type === "param");
  if (parameters.length !== 1) {
    return;
  }
  return {
    pageId: entryPageId,
    params: { [parameters[0].name]: entryBasename },
  };
};
