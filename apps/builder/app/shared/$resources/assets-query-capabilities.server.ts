import { createAssetQueryCapabilities } from "@webstudio-is/sdk";
import { createAssetDescriptionLoader } from "./assets-description.server";

export const loader = createAssetDescriptionLoader({
  createValue: (catalog) => createAssetQueryCapabilities({ catalog }),
});
