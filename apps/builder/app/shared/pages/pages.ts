import { findPageByIdOrPath } from "@webstudio-is/sdk";
import { $pages } from "../nano-states";
import { serverSyncStore } from "../sync";

/**
 * put new path into the beginning of history
 * and drop paths in the end when exceeded 20
 */
export const savePathInHistory = (pageId: string, path: string) => {
  serverSyncStore.createTransaction([$pages], (pages) => {
    if (pages === undefined) {
      return;
    }
    const page = findPageByIdOrPath(pageId, pages);
    if (page === undefined) {
      return;
    }
    const history = Array.from(page.history ?? []);
    history.unshift(path);
    page.history = Array.from(new Set(history)).slice(0, 20);
  });
};
