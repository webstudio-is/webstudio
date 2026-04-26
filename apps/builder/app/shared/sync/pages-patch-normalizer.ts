import type { Patch } from "immer";
import type { Change } from "immerhin";
import type { Folder, Page, Pages } from "@webstudio-is/sdk";

// Sentinel prefix used to distinguish ID-based path segments from numeric indices
// on the wire. Kept as a plain string so patches stay JSON-serializable.
const ID_PREFIX = "@";

const encodeId = (id: string) => `${ID_PREFIX}${id}`;
const decodeId = (seg: string): string | undefined =>
  seg.startsWith(ID_PREFIX) ? seg.slice(ID_PREFIX.length) : undefined;

const isIdSegment = (seg: string | number): seg is string =>
  typeof seg === "string" && seg.startsWith(ID_PREFIX);

const normalizeOnePatch = (
  patch: Patch,
  revisePatches: Patch[],
  pages: Pages
): Patch => {
  const [key, indexOrId, ...rest] = patch.path;
  if (typeof indexOrId !== "number") {
    return patch;
  }
  if (key !== "pages" && key !== "folders") {
    return patch;
  }

  const items: Array<Page | Folder> =
    key === "pages" ? pages.pages : pages.folders;

  if (patch.op === "add") {
    const id = (patch.value as { id?: string } | undefined)?.id;
    if (!id) {
      return patch;
    }
    return { ...patch, path: [key, encodeId(id), ...rest] };
  }

  if (patch.op === "remove") {
    const rp = revisePatches.find(
      (r) => r.op === "add" && r.path[0] === key && r.path[1] === indexOrId
    );
    const id = (rp?.value as { id?: string } | undefined)?.id;
    if (!id) {
      return patch;
    }
    return { ...patch, path: [key, encodeId(id), ...rest] };
  }

  const id = (items[indexOrId] as { id?: string } | undefined)?.id;
  if (!id) {
    return patch;
  }
  return { ...patch, path: [key, encodeId(id), ...rest] };
};

const normalizeRevise = (
  rp: Patch,
  forwardPatches: Patch[],
  pages: Pages
): Patch => {
  const [key, indexOrId, ...rest] = rp.path;
  if (typeof indexOrId !== "number") {
    return rp;
  }
  if (key !== "pages" && key !== "folders") {
    return rp;
  }

  const items: Array<Page | Folder> =
    key === "pages" ? pages.pages : pages.folders;

  if (rp.op === "add") {
    const id = (rp.value as { id?: string } | undefined)?.id;
    if (!id) {
      return rp;
    }
    return { ...rp, path: [key, encodeId(id), ...rest] };
  }

  if (rp.op === "remove") {
    const fp = forwardPatches.find(
      (f) => f.op === "add" && f.path[0] === key && f.path[1] === indexOrId
    );
    const id = (fp?.value as { id?: string } | undefined)?.id;
    if (!id) {
      return rp;
    }
    return { ...rp, path: [key, encodeId(id), ...rest] };
  }

  const id = (items[indexOrId] as { id?: string } | undefined)?.id;
  if (!id) {
    return rp;
  }
  return { ...rp, path: [key, encodeId(id), ...rest] };
};

export const normalizePagesPatch = (
  changes: Change[],
  pagesState: Pages
): Change[] =>
  changes.map((change) => {
    if (change.namespace !== "pages") {
      return change;
    }
    return {
      ...change,
      patches: change.patches.map((p) =>
        normalizeOnePatch(p, change.revisePatches, pagesState)
      ),
      revisePatches: change.revisePatches.map((rp) =>
        normalizeRevise(rp, change.patches, pagesState)
      ),
    };
  });

const denormalizeOnePatch = (patch: Patch, pages: Pages): Patch => {
  const [key, indexOrId, ...rest] = patch.path;
  if (!isIdSegment(indexOrId as string | number)) {
    return patch;
  }
  if (key !== "pages" && key !== "folders") {
    return patch;
  }

  const id = decodeId(indexOrId as string)!;
  const items: Array<Page | Folder> =
    key === "pages" ? pages.pages : pages.folders;

  if (patch.op === "add") {
    // Insert at end - exact position doesn't matter for concurrent adds
    return { ...patch, path: [key, items.length, ...rest] };
  }

  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) {
    // Item not found; return patch unchanged - the apply will fail gracefully
    // (leader drops stale patches, followers silently ignore missing paths)
    return patch;
  }
  return { ...patch, path: [key, idx, ...rest] };
};

export const denormalizePagesPatch = (
  changes: Change[],
  currentState: Pages
): Change[] =>
  changes.map((change) => {
    if (change.namespace !== "pages") {
      return change;
    }
    return {
      ...change,
      patches: change.patches.map((p) => denormalizeOnePatch(p, currentState)),
      revisePatches: change.revisePatches.map((rp) =>
        denormalizeOnePatch(rp, currentState)
      ),
    };
  });
