import { createAssetQueryCapabilities } from "@webstudio-is/sdk";
import { createAssetResourceOpenApi } from "@webstudio-is/sdk/asset-resource-api";
import { createAssetDescriptionLoader } from "./assets-description.server";
import { builderSessionCookieName } from "~/services/builder-session.server";

export const loader = createAssetDescriptionLoader({
  createValue: (catalog) =>
    createAssetResourceOpenApi({
      capabilities: createAssetQueryCapabilities({ catalog }),
      builderSessionCookieName,
    }),
  contentType: "application/vnd.oai.openapi+json;version=3.1",
});
