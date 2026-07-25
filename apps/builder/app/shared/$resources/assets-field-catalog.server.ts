import { createAssetDescriptionLoader } from "./assets-description.server";

export const loader = createAssetDescriptionLoader({
  createValue: (catalog) => catalog,
});
