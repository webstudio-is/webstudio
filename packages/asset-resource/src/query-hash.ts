import { sha256 } from "@webstudio-is/project-store";

export const computeAssetResourceQueryHash = async (query: string) =>
  await sha256(query);
