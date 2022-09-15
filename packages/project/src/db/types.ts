import { z } from "zod";
import { type Project as BaseProject } from "@webstudio-is/prisma-client";
import type { Asset } from "@webstudio-is/asset-uploader";
const TreeHistorySchema = z.array(z.string());

export type Project = Omit<BaseProject, "prodTreeIdHistory" | "assets"> & {
  prodTreeIdHistory: z.infer<typeof TreeHistorySchema>;
  assets?: Array<Asset>;
};
