import { z } from "zod";
import {
  assetFolderIssue,
  assetFolderName,
  assetFolders,
  createAssetFolderHierarchy,
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

export const deleteAssetFolder = (
  state: Pick<BuilderState, "assetFolders" | "assets">,
  input: z.infer<typeof assetFolderDeleteInput>
) => {
  const folders = getRequiredFolders(state);
  const folder = folders.get(input.folderId);
  if (folder === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Folder not found");
  }

  const deletedFolderIds = createAssetFolderHierarchy(folders).getDescendantIds(
    folder.id
  );
  deletedFolderIds.add(folder.id);
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
