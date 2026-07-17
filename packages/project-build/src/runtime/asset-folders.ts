import { z } from "zod";
import {
  assetFolderIssue,
  assetFolderName,
  assetFolders,
  createAssetFolderHierarchy,
  type Asset,
  type AssetFolder,
  type AssetFolders,
} from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import {
  appendOptionalPropertyPatch,
  type BuilderPatch,
} from "../contracts/patch";
import type { BuilderRuntimeContext } from "./context";
import { throwBuilderRuntimeError } from "./errors";
import { createRuntimeMutation } from "./mutation";
import { createCopyName } from "./copy-name";
import { getAssetDisplayFilename } from "./assets";

export const assetFolderListInput = z.object({});

export const assetFolderCreateInput = z.object({
  name: assetFolderName,
  parentId: z.string().min(1).optional(),
});

export const assetFolderUpdateInput = z.object({
  folderId: z.string().min(1),
  values: z
    .object({
      name: assetFolderName.optional(),
      parentId: z.string().min(1).nullable().optional(),
    })
    .refine((values) => Object.keys(values).length > 0, {
      message: "At least one folder field is required",
    }),
});

export const assetFolderDeleteInput = z.object({ folderId: z.string().min(1) });

export const assetFolderDuplicateInput = z.object({
  folderId: z.string().min(1),
  parentId: z.string().min(1).nullable().optional(),
});

const getRequiredFolders = (state: Pick<BuilderState, "assetFolders">) => {
  if (state.assetFolders === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Asset folders are not loaded"
    );
  }
  return state.assetFolders;
};

const validateFolderMutation = (folders: AssetFolders, name: string) => {
  const result = assetFolders.safeParse(folders);
  if (result.success) {
    return;
  }
  const issue = result.error.issues[0];
  if (issue?.message === assetFolderIssue.duplicateName) {
    return throwBuilderRuntimeError(
      "CONFLICT",
      `A folder named "${name}" already exists in this location`
    );
  }
  if (issue?.message === assetFolderIssue.parentMissing) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent folder not found");
  }
  if (
    issue?.message === assetFolderIssue.selfParent ||
    issue?.message === assetFolderIssue.cycle
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "A folder can't be moved into itself or one of its descendants"
    );
  }
  return throwBuilderRuntimeError(
    "BAD_REQUEST",
    issue?.message ?? "Invalid asset folder hierarchy"
  );
};

export const listAssetFolders = (
  state: Pick<BuilderState, "assetFolders">,
  _input: z.infer<typeof assetFolderListInput>
) => ({ folders: Array.from(getRequiredFolders(state).values()) });

export const createAssetFolder = (
  state: Pick<BuilderState, "assetFolders">,
  input: z.infer<typeof assetFolderCreateInput>,
  context: BuilderRuntimeContext
) => {
  const folders = getRequiredFolders(state);
  if (context.projectId === undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Project id is required");
  }
  const folder: AssetFolder = {
    id: context.createId(),
    projectId: context.projectId,
    name: input.name.trim(),
    parentId: input.parentId,
    createdAt: new Date().toISOString(),
  };
  const nextFolders = new Map(folders).set(folder.id, folder);
  validateFolderMutation(nextFolders, folder.name);
  return createRuntimeMutation({
    payload: [
      {
        namespace: "assetFolders",
        patches: [{ op: "add", path: [folder.id], value: folder }],
      },
    ],
    result: { folderId: folder.id },
    invalidatesNamespaces: ["assetFolders"],
  });
};

export const updateAssetFolder = (
  state: Pick<BuilderState, "assetFolders">,
  input: z.infer<typeof assetFolderUpdateInput>
) => {
  const folders = getRequiredFolders(state);
  const folder = folders.get(input.folderId);
  if (folder === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Folder not found");
  }
  const nextName = input.values.name?.trim() ?? folder.name;
  const nextParentId =
    input.values.parentId === null
      ? undefined
      : (input.values.parentId ?? folder.parentId);
  const nextFolders = new Map(folders).set(folder.id, {
    ...folder,
    name: nextName,
    parentId: nextParentId,
  });
  validateFolderMutation(nextFolders, nextName);

  const patches: BuilderPatch[] = [];
  if (nextName !== folder.name) {
    patches.push({
      op: "replace",
      path: [folder.id, "name"],
      value: nextName,
    });
  }
  appendOptionalPropertyPatch(patches, {
    path: [folder.id, "parentId"],
    previous: folder.parentId,
    next: nextParentId,
  });
  return createRuntimeMutation({
    payload:
      patches.length === 0 ? [] : [{ namespace: "assetFolders", patches }],
    result: { folderId: folder.id },
    invalidatesNamespaces: patches.length === 0 ? [] : ["assetFolders"],
  });
};

export const duplicateAssetFolder = (
  state: Pick<BuilderState, "assetFolders" | "assets">,
  input: z.infer<typeof assetFolderDuplicateInput>,
  context: BuilderRuntimeContext
) => {
  const folders = getRequiredFolders(state);
  const source = folders.get(input.folderId);
  if (source === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Folder not found");
  }
  const parentId =
    input.parentId === undefined
      ? source.parentId
      : (input.parentId ?? undefined);
  if (parentId !== undefined && folders.has(parentId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent folder not found");
  }

  const hierarchy = createAssetFolderHierarchy(folders);
  const sourceFolderIds = hierarchy.getSubtreeIds(source.id);
  const sourceFolders = hierarchy.sortByDepth(
    Array.from(sourceFolderIds, (folderId) => folders.get(folderId)!)
  );
  const duplicatedIds = new Map<string, string>();
  const duplicatedFolders: AssetFolder[] = [];
  const copiedRootName = createCopyName(
    source.name,
    (candidate) =>
      hierarchy.findByName({ name: candidate, parentId }) !== undefined
  );
  const createdAt = new Date().toISOString();
  for (const folder of sourceFolders) {
    const id = context.createId();
    duplicatedIds.set(folder.id, id);
    duplicatedFolders.push({
      ...folder,
      id,
      name: folder.id === source.id ? copiedRootName : folder.name,
      parentId:
        folder.id === source.id
          ? parentId
          : duplicatedIds.get(folder.parentId!),
      createdAt,
    });
  }

  const displayFilenames = new Set(
    Array.from(state.assets?.values() ?? [], getAssetDisplayFilename)
  );
  const duplicatedAssets: Asset[] = [];
  for (const asset of state.assets?.values() ?? []) {
    if (
      asset.folderId === undefined ||
      sourceFolderIds.has(asset.folderId) === false
    ) {
      continue;
    }
    const filename = createCopyName(
      getAssetDisplayFilename(asset),
      (candidate) => displayFilenames.has(candidate)
    );
    displayFilenames.add(filename);
    duplicatedAssets.push({
      ...asset,
      id: context.createId(),
      filename,
      folderId: duplicatedIds.get(asset.folderId),
    });
  }

  const nextFolders = new Map(folders);
  for (const folder of duplicatedFolders) {
    nextFolders.set(folder.id, folder);
  }
  validateFolderMutation(nextFolders, copiedRootName);
  return createRuntimeMutation({
    payload: [
      {
        namespace: "assetFolders",
        patches: duplicatedFolders.map((folder) => ({
          op: "add" as const,
          path: [folder.id],
          value: folder,
        })),
      },
      ...(duplicatedAssets.length === 0
        ? []
        : [
            {
              namespace: "assets" as const,
              patches: duplicatedAssets.map((asset) => ({
                op: "add" as const,
                path: [asset.id],
                value: asset,
              })),
            },
          ]),
    ],
    result: { folderId: duplicatedIds.get(source.id)! },
    invalidatesNamespaces: ["assetFolders", "assets"],
  });
};

export const deleteAssetFolder = (
  state: Pick<BuilderState, "assetFolders" | "assets">,
  input: z.infer<typeof assetFolderDeleteInput>
) => {
  const folders = getRequiredFolders(state);
  const folder = folders.get(input.folderId);
  if (folder === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Folder not found");
  }

  const deletedFolderIds = createAssetFolderHierarchy(folders).getSubtreeIds(
    folder.id
  );
  const folderPatches: BuilderPatch[] = Array.from(deletedFolderIds).map(
    (folderId) => ({ op: "remove", path: [folderId] })
  );

  const assetPatches: BuilderPatch[] = [];
  for (const asset of state.assets?.values() ?? []) {
    if (asset.folderId !== undefined && deletedFolderIds.has(asset.folderId)) {
      assetPatches.push({ op: "remove", path: [asset.id] });
    }
  }

  return createRuntimeMutation({
    payload: [
      { namespace: "assetFolders", patches: folderPatches },
      ...(assetPatches.length === 0
        ? []
        : [{ namespace: "assets" as const, patches: assetPatches }]),
    ],
    result: { folderId: folder.id },
    invalidatesNamespaces: ["assetFolders", "assets"],
  });
};
