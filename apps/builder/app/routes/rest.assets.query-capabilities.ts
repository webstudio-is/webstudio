import { createAssetQueryCapabilities } from "@webstudio-is/sdk";
import { createAssetDescriptionLoader } from "~/shared/$resources/assets-description.server";

export const loader = createAssetDescriptionLoader({
  createValue: (catalog) => createAssetQueryCapabilities({ catalog }),
});
