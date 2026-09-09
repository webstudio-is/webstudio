import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import {
  createDefaultStructuredAssetQueryResourceConfiguration,
  type Resource,
} from "@webstudio-is/sdk";
import {
  createAssetQueryJsonSchema,
  createAssetResourceOpenApi,
} from "@webstudio-is/protocol/asset-resource-api";
import { AssetQueryForm, __testing__ } from "./asset-query-form";

const {
  configureAssetQueryDefinition,
  getAssetQueryConfigurationValidation,
  loadAssetQueryDefinition,
} = __testing__;

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

test("reports while the query editor is loading", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onPendingChange = vi.fn();
  let resolveFetch: (response: Response) => void = () => {};

  act(() => {
    root?.render(
      <AssetQueryForm
        scope={{}}
        aliases={new Map()}
        fetchDescription={() =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
        }
        onPendingChange={onPendingChange}
      />
    );
  });

  expect(onPendingChange).toHaveBeenLastCalledWith(true);

  await act(async () => {
    resolveFetch(new Response(undefined, { status: 500 }));
  });

  expect(onPendingChange).toHaveBeenLastCalledWith(false);
});

test("preserves and explains an invalid stored Assets query", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const body = "({ query: { where: 1 } })";
  const resource: Resource = {
    id: "posts",
    name: "Posts",
    control: "system",
    method: "post",
    url: '"/$resources/assets"',
    headers: [],
    body,
  };

  act(() => {
    root?.render(
      <AssetQueryForm
        resource={resource}
        scope={{}}
        aliases={new Map()}
        fetchDescription={() => new Promise(() => {})}
      />
    );
  });

  expect(container.textContent).toContain(
    "Stored Assets query is invalid: Enter valid filters."
  );
  expect(
    container.querySelector<HTMLInputElement>('input[name="body"]')?.value
  ).toBe(body);
  expect(
    container.querySelector<HTMLInputElement>('input[name="asset-query-valid"]')
      ?.value
  ).toBe("false");
});

test("reports every issue from the shared query validator", () => {
  const configuration =
    createDefaultStructuredAssetQueryResourceConfiguration();

  expect(
    getAssetQueryConfigurationValidation({
      configuration: {
        ...configuration,
        where: {
          all: [
            {
              field: ["size"],
              operator: "gt",
              value: '"large"',
            },
            {
              field: ["extension"],
              operator: "contains",
              value: "{}",
            },
          ],
        },
      },
      scope: {},
    }).issues
  ).toMatchObject([
    {
      code: "INCOMPATIBLE_VALUE",
      path: ["query", "where", "all", "0", "value"],
    },
    {
      code: "INCOMPATIBLE_VALUE",
      path: ["query", "where", "all", "1", "value"],
    },
  ]);
});

test("reports every invalid query value expression", () => {
  const configuration =
    createDefaultStructuredAssetQueryResourceConfiguration();

  expect(
    getAssetQueryConfigurationValidation({
      configuration: {
        ...configuration,
        where: {
          all: [
            { field: ["size"], operator: "gt", value: "(" },
            { field: ["extension"], operator: "eq", value: "}" },
          ],
        },
        limit: "missing(",
        offset: "alsoMissing(",
      },
      scope: {},
    }).issues
  ).toMatchObject([
    {
      code: "INVALID_QUERY_EXPRESSION",
      path: ["query", "where", "all", "0", "value"],
    },
    {
      code: "INVALID_QUERY_EXPRESSION",
      path: ["query", "where", "all", "1", "value"],
    },
    {
      code: "INVALID_QUERY_EXPRESSION",
      path: ["query", "limit"],
    },
    {
      code: "INVALID_QUERY_EXPRESSION",
      path: ["query", "offset"],
    },
  ]);
});

test("uses the loaded field catalog with the shared query validator", () => {
  const configuration =
    createDefaultStructuredAssetQueryResourceConfiguration();
  const definition = {
    version: 1,
    fields: [
      {
        path: ["properties", "score"] as string[],
        label: "score",
        types: ["number"] as string[],
      },
    ],
    operators: [],
    source: { fieldPathSchema: true, controls: [] },
  } as const;

  expect(
    getAssetQueryConfigurationValidation({
      configuration: {
        ...configuration,
        where: {
          field: ["properties", "score"],
          operator: "eq",
          value: '"high"',
        },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["properties", "missing"]],
        },
      },
      scope: {},
      definition,
    }).issues
  ).toMatchObject([
    {
      severity: "warning",
      code: "INCOMPATIBLE_OBSERVED_VALUE",
      path: ["query", "where", "value"],
    },
    {
      severity: "warning",
      code: "UNOBSERVED_FIELD",
      path: ["query", "output", "fields", "0"],
    },
  ]);
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
