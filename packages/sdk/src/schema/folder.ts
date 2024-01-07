import { z } from "zod";
import { PageId } from "./pages";

const FolderId = z.string();

export const Folder = z.object({
  id: FolderId,
  name: z.string(),
  path: z.string(),
  children: z.array(z.union([FolderId, PageId])),
});

export type Folder = z.infer<typeof Folder>;
