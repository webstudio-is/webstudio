import {
  listProjectAssets,
  listProjectAssetFolders,
} from "@webstudio-is/http-client";
import { $assets, $assetFolders } from "./data-stores";
import { externalContentSyncStore } from "./sync-stores";
import { invalidateAssets } from "../resources";

export const refreshPageCopyCatalog = async (
  connection: Parameters<typeof listProjectAssets>[0],
  { assetIds, folderIds }: { assetIds: string[]; folderIds: string[] },
  signal: AbortSignal
) => {
  const [{ assets }, { folders }] = await Promise.all([
    listProjectAssets(connection),
    listProjectAssetFolders(connection),
  ]);
  signal.throwIfAborted();
  const refresh = <Item extends { id: string }>(
    namespace: string,
    ids: string[],
    stored: ReadonlyMap<string, Item>,
    current: Item[]
  ) => {
    const items = new Map(current.map((item) => [item.id, item]));
    const patches = ids.map((id) => {
      const value = items.get(id);
      if (value === undefined) {
        // The record may have been deleted after the copy committed.
        return stored.has(id)
          ? { op: "remove" as const, path: [id] }
          : undefined;
      }
      return {
        op: stored.has(id) ? ("replace" as const) : ("add" as const),
        path: [id],
        value,
      };
    });
    return {
      namespace,
      patches: patches.filter((patch) => patch !== undefined),
      revisePatches: [],
    };
  };
  externalContentSyncStore.createTransactionFromChanges(
    [
      refresh("assets", assetIds, $assets.get(), assets),
      refresh("assetFolders", folderIds, $assetFolders.get(), folders),
    ].filter(({ patches }) => patches.length > 0)
  );
  invalidateAssets();
};
