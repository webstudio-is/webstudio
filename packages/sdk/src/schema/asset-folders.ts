import { z } from "zod";
import {
  createAssetFolderHierarchy,
  getAssetFolderSiblingKey,
} from "../asset-folder-hierarchy";

export const assetFolderId = z.string().min(1);

export const assetFolderName = z
  .string()
  .trim()
  .min(1, "Folder name can't be empty");

export const assetFolderIssue = {
  idMismatch: "Folder id must match its record key",
  selfParent: "Folder can't be its own parent",
  parentMissing: "Parent folder must exist",
  duplicateName: "Folder name must be unique within its parent",
  projectMismatch: "All folders must belong to the same project",
  cycle: "Folders can't contain cycles",
} as const;

export const assetFolder = z.object({
  id: assetFolderId,
  projectId: z.string().min(1),
  name: assetFolderName,
  parentId: assetFolderId.optional(),
  createdAt: z.string(),
});

export type AssetFolder = z.infer<typeof assetFolder>;

export const assetFolders = z
  .map(assetFolderId, assetFolder)
  .superRefine((folders, context) => {
    const siblingKeys = new Set<string>();
    const projectIds = new Set<string>();

    for (const [folderId, folder] of folders) {
      projectIds.add(folder.projectId);
      if (folder.id !== folderId) {
        context.addIssue({
          code: "custom",
          path: [folderId, "id"],
          message: assetFolderIssue.idMismatch,
        });
      }
      if (folder.parentId === folder.id) {
        context.addIssue({
          code: "custom",
          path: [folderId, "parentId"],
          message: assetFolderIssue.selfParent,
        });
      } else if (
        folder.parentId !== undefined &&
        folders.has(folder.parentId) === false
      ) {
        context.addIssue({
          code: "custom",
          path: [folderId, "parentId"],
          message: assetFolderIssue.parentMissing,
        });
      }

      const siblingKey = getAssetFolderSiblingKey(folder.parentId, folder.name);
      if (siblingKeys.has(siblingKey)) {
        context.addIssue({
          code: "custom",
          path: [folderId, "name"],
          message: assetFolderIssue.duplicateName,
        });
      }
      siblingKeys.add(siblingKey);
    }

    if (projectIds.size > 1) {
      context.addIssue({
        code: "custom",
        message: assetFolderIssue.projectMismatch,
      });
    }

    const hierarchy = createAssetFolderHierarchy(folders);
    for (const folderId of folders.keys()) {
      if (hierarchy.hasCycle(folderId)) {
        context.addIssue({
          code: "custom",
          path: [folderId, "parentId"],
          message: assetFolderIssue.cycle,
        });
      }
    }
  });

export type AssetFolders = z.infer<typeof assetFolders>;
