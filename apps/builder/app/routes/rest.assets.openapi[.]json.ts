import { createAssetResourceOpenApi } from "@webstudio-is/protocol/asset-resource-api";
import { createStaticAssetDescriptionLoader } from "~/shared/$resources/assets-description.server";
import { builderSessionCookieName } from "~/services/builder-session.server";
import { assetsQuerySchemaApiUrl } from "@webstudio-is/sdk/runtime";

export const loader = createStaticAssetDescriptionLoader({
  createValue: ({ projectId }) =>
    createAssetResourceOpenApi({
      builderSessionCookieName,
      querySchemaReference: `${assetsQuerySchemaApiUrl}?projectId=${encodeURIComponent(projectId)}`,
    }),
  contentType: "application/vnd.oai.openapi+json;version=3.1",
});
