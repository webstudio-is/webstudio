import type { Patch } from "immer";
import type { Pages } from "@webstudio-is/sdk";

export type PagesPatchChange = {
  namespace: string;
  patches: Patch[];
  revisePatches?: Patch[];
};

const ID_PREFIX = "@";

type PageCollectionKey = "pages" | "folders";
type AppendedItemIndexes = Map<PageCollectionKey, Map<string, number>>;

const encodeId = (id: string) => `${ID_PREFIX}${id}`;

const isIdSegment = (segment: string | number): segment is string => {
  return typeof segment === "string" && segment.startsWith(ID_PREFIX);
};

const isPagesCollectionKey = (
  key: string | number | undefined
): key is PageCollectionKey => {
  return key === "pages" || key === "folders";
};

const getItems = (pages: Pages, key: PageCollectionKey) => {
  return key === "pages" ? pages.pages : pages.folders;
};

const getItemIdAtIndex = (
  pages: Pages,
  key: PageCollectionKey,
  index: number
) => {
  return (getItems(pages, key)[index] as { id?: string } | undefined)?.id;
};

const findAddedItemId = (
  patches: Patch[],
  key: PageCollectionKey,
  index: number
) => {
  const addPatch = patches.find(
    (patch) =>
      patch.op === "add" && patch.path[0] === key && patch.path[1] === index
  );
  return (addPatch?.value as { id?: string } | undefined)?.id;
};

const getNextAppendIndex = (
  items: ReturnType<typeof getItems>,
  itemIndexes: Map<string, number>
) => {
  const appendedCount = [...itemIndexes.values()].filter(
    (index) => index >= items.length
  ).length;
  return items.length + appendedCount;
};

const normalizePatch = (
  patch: Patch,
  counterpartPatches: Patch[],
  pages: Pages
): Patch => {
  const [key, indexOrId, ...rest] = patch.path;
  if (typeof indexOrId !== "number") {
    return patch;
  }
  if (isPagesCollectionKey(key) === false) {
    return patch;
  }

  let id: string | undefined;
  const isItemPatch = rest.length === 0;

  if (isItemPatch && patch.op === "add") {
    id = (patch.value as { id?: string } | undefined)?.id;
  } else if (isItemPatch && patch.op === "remove") {
    // Immer remove patches only contain the removed array index. The matching
    // reverse add patch carries the removed page/folder value, so top-level
    // removes need revise patches to recover the stable item id.
    id = findAddedItemId(counterpartPatches, key, indexOrId);
  } else {
    id = getItemIdAtIndex(pages, key, indexOrId);
  }

  if (!id) {
    return patch;
  }
  return { ...patch, path: [key, encodeId(id), ...rest] };
};

const denormalizeOnePatch = (
  patch: Patch,
  pages: Pages,
  appendedItemIndexes: AppendedItemIndexes,
  { onMissing = "keep" }: { onMissing?: "keep" | "throw" } = {}
): Patch => {
  const [key, indexOrId, ...rest] = patch.path;
  if (isPagesCollectionKey(key) === false) {
    return patch;
  }
  if (isIdSegment(indexOrId as string | number) === false) {
    return patch;
  }

  const id = (indexOrId as string).slice(ID_PREFIX.length);
  const items = getItems(pages, key);
  const itemIndexes = appendedItemIndexes.get(key) ?? new Map();
  appendedItemIndexes.set(key, itemIndexes);
  const knownIndex = itemIndexes.get(id);

  if (rest.length === 0 && patch.op === "add") {
    if (knownIndex !== undefined) {
      return { ...patch, path: [key, knownIndex] };
    }
    const index = getNextAppendIndex(items, itemIndexes);
    itemIndexes.set(id, index);
    return { ...patch, path: [key, index] };
  }

  const index = knownIndex ?? items.findIndex((item) => item.id === id);
  if (index === -1) {
    if (onMissing === "throw") {
      throw new Error(
        `Unable to apply pages patch. Item "${id}" was not found.`
      );
    }
    return patch;
  }
  itemIndexes.set(id, index);

  return { ...patch, path: [key, index, ...rest] };
};

export const normalizePagesPatch = <ChangeType extends PagesPatchChange>(
  changes: ChangeType[],
  pages: Pages
): ChangeType[] =>
  changes.map((change) => {
    if (change.namespace !== "pages") {
      return change;
    }
    const revisePatches = change.revisePatches ?? [];
    const normalizedChange = {
      ...change,
      patches: change.patches.map((patch) =>
        normalizePatch(patch, revisePatches, pages)
      ),
    };
    if (change.revisePatches === undefined) {
      return normalizedChange;
    }
    return {
      ...normalizedChange,
      revisePatches: change.revisePatches.map((revisePatch) =>
        normalizePatch(revisePatch, change.patches, pages)
      ),
    };
  });

export const denormalizePagesPatch = <ChangeType extends PagesPatchChange>(
  changes: ChangeType[],
  pages: Pages,
  options?: { onMissing?: "keep" | "throw" }
): ChangeType[] =>
  changes.map((change) => {
    if (change.namespace !== "pages") {
      return change;
    }
    const appendedItemIndexes: AppendedItemIndexes = new Map();
    const denormalizedChange = {
      ...change,
      patches: change.patches.map((patch) =>
        denormalizeOnePatch(patch, pages, appendedItemIndexes, options)
      ),
    };
    if (change.revisePatches === undefined) {
      return denormalizedChange;
    }
    return {
      ...denormalizedChange,
      revisePatches: change.revisePatches.map((revisePatch) =>
        denormalizeOnePatch(revisePatch, pages, appendedItemIndexes, options)
      ),
    };
  });
