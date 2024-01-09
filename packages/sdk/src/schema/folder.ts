import { z } from "zod";
import { PageId } from "./pages";

const FolderId = z.string();

export const FolderName = z
  .string()
  .refine((value) => value.trim() !== "", "Can't be empty");

export const FolderSlug = z
  .string()
  .refine((slug) => slug !== "", "Can't be empty")
  .refine((slug) => slug.includes("/") === false, "Can't contain a /")
  .refine(
    (path) => /^[-a-z0-9]*$/.test(path),
    "Only a-z, 0-9 and - are allowed"
  );

export const Folder = z.object({
  id: FolderId,
  name: FolderName,
  slug: z.string(),
  children: z.array(z.union([FolderId, PageId])),
  parentFolderId: z.string().optional(),
});

export type Folder = z.infer<typeof Folder>;

export const Folders = z.map(FolderId, Folder);

export type Folders = z.infer<typeof Folders>;
