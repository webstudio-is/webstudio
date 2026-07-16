import { z } from "zod";

export const assetFolderId = z.string().min(1);

export const assetFolderName = z
  .string()
  .trim()
  .min(1, "Folder name can't be empty");

export const normalizeAssetFolderName = (name: string) =>
  name.trim().toLowerCase();

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
    const namesByParent = new Map<string | undefined, Set<string>>();
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

      const siblingNames = namesByParent.get(folder.parentId) ?? new Set();
      const normalizedName = normalizeAssetFolderName(folder.name);
      if (siblingNames.has(normalizedName)) {
        context.addIssue({
          code: "custom",
          path: [folderId, "name"],
          message: assetFolderIssue.duplicateName,
        });
      }
      siblingNames.add(normalizedName);
      namesByParent.set(folder.parentId, siblingNames);
    }

    if (projectIds.size > 1) {
      context.addIssue({
        code: "custom",
        message: assetFolderIssue.projectMismatch,
      });
    }

    for (const folderId of folders.keys()) {
      const visited = new Set<string>();
      let currentId: string | undefined = folderId;
      while (currentId !== undefined) {
        if (visited.has(currentId)) {
          context.addIssue({
            code: "custom",
            path: [folderId, "parentId"],
            message: assetFolderIssue.cycle,
          });
          break;
        }
        visited.add(currentId);
        currentId = folders.get(currentId)?.parentId;
      }
    }
  });

export type AssetFolders = z.infer<typeof assetFolders>;
