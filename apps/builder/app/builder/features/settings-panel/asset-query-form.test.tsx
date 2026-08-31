import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import {
  createAssetQueryJsonSchema,
  createAssetResourceOpenApi,
} from "@webstudio-is/protocol/asset-resource-api";
import { AssetQueryForm, __testing__ } from "./asset-query-form";

const { configureAssetQueryDefinition, loadAssetQueryDefinition } = __testing__;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("renders a centered message while the OpenAPI description is loading", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <AssetQueryForm
        scope={{}}
        aliases={new Map()}
        fetchDescription={() => new Promise(() => {})}
      />
    );
  });

  expect(container.textContent).toContain("Loading query editor…");
});

test("loads the external query schema declared by OpenAPI", async () => {
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
      },
    },
  });
  const fetchDescription = vi.fn(async (input: RequestInfo | URL) =>
    Response.json(
      String(input).includes("query-schema.json") ? querySchema : openApi
    )
  );

  const definition = await loadAssetQueryDefinition(fetchDescription);

  expect(fetchDescription).toHaveBeenCalledTimes(2);
  expect(fetchDescription.mock.calls[1][0]).toBe(
    `${window.location.origin}/rest/assets/query-schema.json`
  );
  expect(definition.fields).toContainEqual(
    expect.objectContaining({ path: ["properties", "title"] })
  );
  const manyControls = configureAssetQueryDefinition({
    definition,
    paths: [],
    result: "many",
  }).source.controls;
  const oneControls = configureAssetQueryDefinition({
    definition,
    paths: [],
    result: "one",
  }).source.controls;

  expect(manyControls.slice(-2).map(({ key }) => key)).toEqual([
    "output",
    "result",
  ]);
  expect(manyControls.map(({ key }) => key)).toEqual(
    expect.arrayContaining(["limit", "offset"])
  );
  expect(oneControls.map(({ key }) => key)).not.toEqual(
    expect.arrayContaining(["limit", "offset"])
  );
});
