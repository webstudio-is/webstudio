import type { Patch } from "immer";
import type { Folder, Page, Pages } from "@webstudio-is/sdk";

export type PagesPatchChange = {
  namespace: string;
  patches: Patch[];
  revisePatches?: Patch[];
};

const ID_PREFIX = "@";

const encodeId = (id: string) => `${ID_PREFIX}${id}`;

const isIdSegment = (segment: string | number): segment is string => {
  return typeof segment === "string" && segment.startsWith(ID_PREFIX);
};

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
    const revisePatch = revisePatches.find(
      (rp) => rp.op === "add" && rp.path[0] === key && rp.path[1] === indexOrId
    );
    const id = (revisePatch?.value as { id?: string } | undefined)?.id;
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

const normalizeRevisePatch = (
  revisePatch: Patch,
  patches: Patch[],
  pages: Pages
): Patch => {
  const [key, indexOrId, ...rest] = revisePatch.path;
  if (typeof indexOrId !== "number") {
    return revisePatch;
  }
  if (key !== "pages" && key !== "folders") {
    return revisePatch;
  }

  const items: Array<Page | Folder> =
    key === "pages" ? pages.pages : pages.folders;

  if (revisePatch.op === "add") {
    const id = (revisePatch.value as { id?: string } | undefined)?.id;
    if (!id) {
      return revisePatch;
    }
    return { ...revisePatch, path: [key, encodeId(id), ...rest] };
  }

  if (revisePatch.op === "remove") {
    const patch = patches.find(
      (p) => p.op === "add" && p.path[0] === key && p.path[1] === indexOrId
    );
    const id = (patch?.value as { id?: string } | undefined)?.id;
    if (!id) {
      return revisePatch;
    }
    return { ...revisePatch, path: [key, encodeId(id), ...rest] };
  }

  const id = (items[indexOrId] as { id?: string } | undefined)?.id;
  if (!id) {
    return revisePatch;
  }
  return { ...revisePatch, path: [key, encodeId(id), ...rest] };
};

const denormalizeOnePatch = (
  patch: Patch,
  pages: Pages,
  { onMissing = "keep" }: { onMissing?: "keep" | "throw" } = {}
): Patch => {
  const [key, indexOrId, ...rest] = patch.path;
  if (key !== "pages" && key !== "folders") {
    return patch;
  }
  if (isIdSegment(indexOrId as string | number) === false) {
    return patch;
  }

  const id = (indexOrId as string).slice(ID_PREFIX.length);
  const items: Array<Page | Folder> =
    key === "pages" ? pages.pages : pages.folders;

  if (patch.op === "add") {
    return { ...patch, path: [key, items.length, ...rest] };
  }

  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    if (onMissing === "throw") {
      throw new Error(
        `Unable to apply pages patch. Item "${id}" was not found.`
      );
    }
    return patch;
  }

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
    return {
      ...change,
      patches: change.patches.map((patch) =>
        normalizeOnePatch(patch, revisePatches, pages)
      ),
      revisePatches: revisePatches.map((revisePatch) =>
        normalizeRevisePatch(revisePatch, change.patches, pages)
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
    const denormalizedChange = {
      ...change,
      patches: change.patches.map((patch) =>
        denormalizeOnePatch(patch, pages, options)
      ),
    };
    if (change.revisePatches === undefined) {
      return denormalizedChange;
    }
    return {
      ...denormalizedChange,
      revisePatches: change.revisePatches.map((revisePatch) =>
        denormalizeOnePatch(revisePatch, pages, options)
      ),
    };
  });
