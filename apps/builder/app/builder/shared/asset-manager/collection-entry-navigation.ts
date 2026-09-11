import { getPagePath, type Pages } from "@webstudio-is/sdk";
import { tokenizePathnamePattern } from "@webstudio-is/project-build/runtime";

export const collectionEntryCanvasUnavailableMessage =
  "Choose a dynamic Entry page with one URL parameter in Collection settings.";

export const getCollectionEntryPage = ({
  entryPageId,
  pages,
}: {
  entryPageId: string | undefined;
  pages: Pages | undefined;
}) => {
  if (entryPageId === undefined || pages?.pages.has(entryPageId) !== true) {
    return;
  }
  const path = getPagePath(entryPageId, pages);
  const parameters = tokenizePathnamePattern(path).filter(
    (token) => token.type === "param"
  );
  if (parameters.length !== 1) {
    return;
  }
  return { id: entryPageId, parameter: parameters[0].name, path };
};

export const getCollectionEntryCanvasTarget = ({
  entryPageId,
  entryBasename,
  pages,
}: {
  entryPageId: string | undefined;
  entryBasename: string;
  pages: Pages | undefined;
}) => {
  const page = getCollectionEntryPage({ entryPageId, pages });
  if (page === undefined) {
    return;
  }
  return {
    pageId: page.id,
    params: { [page.parameter]: entryBasename },
  };
};
