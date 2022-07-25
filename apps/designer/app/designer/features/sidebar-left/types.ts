import { Asset } from "@webstudio-is/prisma-client";
import { panels } from "./panels";

export type TabName = keyof typeof panels | "none";

export type UploadingAsset = Pick<
  Asset,
  "id" | "status" | "name" | "path" | "alt"
>;
