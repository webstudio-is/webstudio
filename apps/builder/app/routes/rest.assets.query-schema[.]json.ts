import { createAssetQueryJsonSchema } from "@webstudio-is/protocol/asset-resource-api";
import { createAssetDescriptionLoader } from "~/shared/$resources/assets-description.server";

export const loader = createAssetDescriptionLoader({
  createValue: (catalog) => createAssetQueryJsonSchema({ catalog }),
  contentType: "application/schema+json",
});
