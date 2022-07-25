import { Asset } from "@webstudio-is/prisma-client";
import { panels } from "./panels";

export type TabName = keyof typeof panels | "none";

export type UploadingAsset = {
  id: Asset["id"];
  status: Asset["status"];
  name: Asset["name"];
  path: Asset["path"];
  alt: Asset["alt"];
};
