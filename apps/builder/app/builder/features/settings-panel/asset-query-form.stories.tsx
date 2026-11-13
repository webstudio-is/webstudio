import { useState } from "react";
import {
  createAssetQueryJsonSchema,
  createAssetResourceOpenApi,
} from "@webstudio-is/protocol/asset-resource-api";
import {
  createDefaultStructuredAssetQueryResourceConfiguration,
  createStructuredAssetQueryResourceBody,
  type Resource,
} from "@webstudio-is/sdk";
import { AssetQueryForm } from "./asset-query-form";

export default {
  title: "Settings Panel/Asset query",
  component: AssetQueryForm,
};
const openApi = createAssetResourceOpenApi({
  builderSessionCookieName: "session",
  querySchemaReference: "/rest/assets/query-schema.json",
});
const querySchema = createAssetQueryJsonSchema({
  catalog: {
    format: "webstudio-builder-asset-field-catalog",
    version: 1,
    canonicalRevision: `sha256:${"a".repeat(64)}`,
    documentCount: 1,
    fields: {
      title: {
        queryPath: ["properties", "title"],
        types: ["string"],
        occurrences: 1,
      },
      draft: {
        queryPath: ["properties", "draft"],
        types: ["boolean"],
        occurrences: 1,
      },
    },
  },
});
const loaded: typeof fetch = async (input) =>
  Response.json(
    String(input).includes("query-schema.json") ? querySchema : openApi
  );
const pending: typeof fetch = () => new Promise(() => {});
const failed: typeof fetch = async () =>
  new Response(undefined, { status: 500 });
const scope = {};
const aliases = new Map<string, string>();
const configuration = createDefaultStructuredAssetQueryResourceConfiguration();
const resource: Resource = {
  id: "posts",
  name: "Posts",
  control: "system",
  method: "post",
  url: '"/$resources/assets"',
  headers: [],
  body: createStructuredAssetQueryResourceBody({
    ...configuration,
    where: {
      all: [
        { field: ["properties", "draft"], operator: "eq", value: "false" },
        {
          any: [
            {
              field: ["properties", "title"],
              operator: "eq",
              value: '"Example"',
            },
          ],
        },
      ],
    },
  }),
};
const invalid = { ...resource, body: "({ query: { where: 1 } })" };
const Query = ({
  state,
}: {
  state: "loaded" | "pending" | "error" | "invalid";
}) => {
  const [source, setSource] = useState<HTMLDivElement | null>(null);
  return (
    <div style={{ display: "flex", width: 960, gap: 16 }}>
      <div style={{ width: 420 }}>
        <AssetQueryForm
          resource={state === "invalid" ? invalid : resource}
          scope={scope}
          aliases={aliases}
          sourceContainer={source}
          fetchDescription={
            state === "pending" ? pending : state === "error" ? failed : loaded
          }
        />
      </div>
      <div ref={setSource} style={{ flex: 1 }} />
    </div>
  );
};
export const Loaded = () => <Query state="loaded" />;
export const Pending = () => <Query state="pending" />;
export const Error = () => <Query state="error" />;
export const InvalidSavedQuery = () => <Query state="invalid" />;
