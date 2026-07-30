import { createAssetDescriptionLoader } from "~/shared/$resources/assets-description.server";

export const loader = createAssetDescriptionLoader({
  createValue: (catalog) => catalog,
});
