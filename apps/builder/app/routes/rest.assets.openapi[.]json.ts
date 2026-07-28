import { createAssetResourceOpenApi } from "@webstudio-is/protocol/asset-resource-api";
import { createAssetDescriptionLoader } from "~/shared/$resources/assets-description.server";
import { builderSessionCookieName } from "~/services/builder-session.server";

export const loader = createAssetDescriptionLoader({
  createValue: (catalog) =>
    createAssetResourceOpenApi({
      catalog,
      builderSessionCookieName,
    }),
  contentType: "application/vnd.oai.openapi+json;version=3.1",
});
