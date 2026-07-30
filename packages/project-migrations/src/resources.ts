import {
  createDefaultStructuredAssetQueryResourceConfiguration,
  createStructuredAssetQueryResourceBody,
  hasAssetsResourceUrl,
  type Resource,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";

/** Converts persisted Assets resources to the single structured-query contract. */
export const migrateResourcesMutable = (resources: Iterable<Resource>) => {
  for (const resource of resources) {
    if (resource.method !== "get" || hasAssetsResourceUrl(resource) === false) {
      continue;
    }
    resource.method = "post";
    resource.headers = [
      ...resource.headers.filter(
        ({ name }) => name.toLowerCase() !== "content-type"
      ),
      {
        name: "Content-Type",
        value: JSON.stringify("application/json"),
      },
    ];
    resource.body = createStructuredAssetQueryResourceBody({
      ...createDefaultStructuredAssetQueryResourceConfiguration(),
      // Queryless Assets resources returned the complete project collection.
      // Preserve that behavior during normalization while new resources keep
      // the smaller authoring default.
      limit: String(assetResourceLimits.resultCount),
    });
  }
};
