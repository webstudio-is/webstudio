import { describe, expect, test } from "vitest";
import {
  getInputJsonSchemaMetadata,
  toInputJsonSchemaObject,
  type Assets,
  type InputJsonSchema,
} from "@webstudio-is/sdk";
import { runtimeOperationContracts } from "../contracts/builder-runtime";
import { getRuntimeGeneratedInputPaths } from "../contracts/input-schema";
import { builderRuntimeCutoverManifests } from "./cutover";
import {
  builderRuntimeOperations,
  executeBuilderRuntimeOperation,
  getBuilderRuntimeOperation,
} from "./registry";
import { runtimeGeneratedIdInput } from "./generated-id-input";
import { getRuntimeOutputSchema, runtimeOutputSchemas } from "./output-schemas";
import { getPage, listFolders, listPages } from "./pages";
import {
  getStyleDeclarations,
  listCssVariables,
  listDesignTokens,
} from "./styles";
import {
  inspectInstance,
  listInstances,
  listTextInstances,
  updateTextInstance,
} from "./instances";
import { listDataVariables, listResources } from "./data";
import { listFonts } from "./fonts";
import { bindProps, deleteProps, updateProps } from "./props";
import type { BuilderState } from "../state/builder-state";
import type { SemanticValidationIssue } from "./errors";
import {
  context,
  expectRuntimeValidationError,
  state,
} from "./runtime.test-fixtures";

const hasDirectInputProperty = (
  schema: InputJsonSchema | undefined,
  property: string
): boolean => {
  const schemaObject = toInputJsonSchemaObject(schema);
  if (schemaObject === undefined) {
    return false;
  }
  if (Object.hasOwn(schemaObject.properties ?? {}, property)) {
    return true;
  }
  return (
    schemaObject.oneOf?.some((branch) =>
      hasDirectInputProperty(toInputJsonSchemaObject(branch), property)
    ) ??
    schemaObject.anyOf?.some((branch) =>
      hasDirectInputProperty(toInputJsonSchemaObject(branch), property)
    ) ??
    schemaObject.allOf?.some((branch) =>
      hasDirectInputProperty(toInputJsonSchemaObject(branch), property)
    ) ??
    false
  );
};

const mutationOperationIds = runtimeOperationContracts
  .filter((contract) => contract.kind === "mutation")
  .map((contract) => contract.id);

const getMutationResult = (operation: unknown): unknown => {
  expect(operation).toHaveProperty("result");
  return (operation as { result: unknown }).result;
};

test.each([
  {
    family: "page",
    operationId: "pages.create",
    input: { name: false, path: "/" },
    path: ["name"],
    constraint: "type:string",
  },
  {
    family: "instance",
    operationId: "instances.move",
    input: {
      moves: [
        { instanceId: "item", parentInstanceId: "parent", insertIndex: -1 },
      ],
    },
    path: ["moves", "0", "insertIndex"],
    constraint: "number:minimum:0",
  },
  {
    family: "prop",
    operationId: "instances.updateProps",
    input: { updates: "not-an-array" },
    path: ["updates"],
    constraint: "type:array",
  },
  {
    family: "style",
    operationId: "styles.updateDeclarations",
    input: { updates: [{ instanceId: "item", property: false, value: "red" }] },
    path: ["updates", "0", "property"],
    constraint: "type:string",
  },
  {
    family: "resource",
    operationId: "resources.create",
    input: {
      resource: { name: "Posts", method: "get", url: "/posts", headers: {} },
    },
    path: ["resource", "headers"],
    constraint: "type:array",
  },
  {
    family: "expression",
    operationId: "instances.updateProps",
    input: {
      updates: [
        {
          instanceId: "item",
          name: "title",
          type: "expression",
          value: "invalid {",
        },
      ],
    },
    path: ["updates", "0", "value"],
    constraint: "valid_webstudio_expression",
  },
  {
    family: "project settings",
    operationId: "projectSettings.update",
    input: { meta: { siteName: false } },
    path: ["meta", "siteName"],
    constraint: "type:string",
  },
])(
  "returns an actionable $family input issue",
  ({ operationId, input, path, constraint }) => {
    expectRuntimeValidationError(operationId, input, { path, constraint });
  }
);

test("keeps generated runtime contracts in sync with the registry", () => {
  expect(runtimeOperationContracts).toEqual(
    builderRuntimeOperations.map(
      ({
        id,
        command,
        client,
        permit,
        kind,
        inputJsonSchema,
        outputJsonSchema,
        readNamespaces,
        writeNamespaces,
        invalidatesNamespaces,
        retryOnConflict,
        requiresAssets,
        requiresConfirm,
      }) => ({
        id,
        command,
        client,
        permit,
        kind,
        inputSchema: inputJsonSchema,
        outputSchema: outputJsonSchema,
        readNamespaces,
        writeNamespaces,
        invalidatesNamespaces,
        retryOnConflict,
        requiresAssets,
        requiresConfirm,
      })
    )
  );
});

test("requires an output schema for every runtime operation", () => {
  expect(
    builderRuntimeOperations
      .filter((operation) => operation.outputSchema === undefined)
      .map((operation) => operation.id)
  ).toEqual([]);
  expect(
    Object.keys(runtimeOutputSchemas)
      .filter((operationId) => operationId.startsWith("system.") === false)
      .sort()
  ).toEqual(builderRuntimeOperations.map((operation) => operation.id).sort());
  expect(() => getRuntimeOutputSchema("missing.operation")).toThrow(
    'Missing runtime output schema for operation "missing.operation".'
  );
});

test("validates structured runtime operation results", () => {
  expect(
    getRuntimeOutputSchema("resources.update").parse({ resourceId: "resource" })
  ).toEqual({ resourceId: "resource" });
  expect(
    getRuntimeOutputSchema("resources.update").parse({
      resourceId: "resource",
      dataSourceId: "data-source",
      warnings: [
        {
          severity: "warning",
          code: "expression_lint_warning",
          path: ["resource", "url"],
          message: '"missing" is not defined in the scope',
          range: { from: 0, to: 7 },
          remediation: "Use an in-scope variable.",
        },
      ],
    })
  ).toMatchObject({
    dataSourceId: "data-source",
    warnings: [{ code: "expression_lint_warning" }],
  });

  expect(
    getRuntimeOutputSchema("instances.deleteBySelector").safeParse({
      instanceSelector: ["instance", "parent"],
    }).success
  ).toBe(false);
  expect(
    getRuntimeOutputSchema("instances.replacePropText").parse({
      changedCount: 1,
      matchingPropCount: 1,
      truncated: false,
      matches: [
        {
          propId: "prop",
          instanceId: "instance",
          name: "title",
          before: "Before",
          after: "After",
        },
      ],
    }).matches
  ).toHaveLength(1);
});

describe("builder runtime pages", () => {
  test("lists pages and folders from shared state", () => {
    expect(listPages(state, { includeFolders: true })).toMatchObject({
      pages: [
        { id: "home", path: "", isHome: true, parentFolderId: "root" },
        { id: "post", path: "/blog/post", parentFolderId: "blog" },
      ],
      folders: [
        { id: "root", children: ["home", "blog"] },
        { id: "blog", children: ["post"] },
      ],
    });

    expect(listFolders(state, { includePages: true })).toMatchObject({
      folders: [
        { id: "root", parentFolderId: undefined },
        { id: "blog", parentFolderId: "root" },
      ],
      pages: [{ id: "home" }, { id: "post" }],
    });
  });

  test("gets page details by id and path", () => {
    expect(getPage(state, { pageId: "post" })).toMatchObject({
      id: "post",
      path: "/blog/post",
      meta: {
        description: "Post description",
        excludePageFromSearch: true,
        documentType: "html",
      },
    });

    expect(
      executeBuilderRuntimeOperation({
        id: "pages.getByPath",
        state,
        input: { path: "/blog/post" },
        context,
      })
    ).toMatchObject({ id: "post" });
  });

  test("validates page and folder mutations through public operations", () => {
    expect(() =>
      executeBuilderRuntimeOperation({
        id: "pages.create",
        state,
        input: {
          name: "Broken",
          path: "/prefix-:id",
        },
        context,
      })
    ).toThrow();

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "pages.update",
        state,
        input: {
          pageId: "post",
          values: { path: "/blog-*" },
        },
        context,
      })
    ).toThrow();

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "folders.create",
        state,
        input: {
          name: "Invalid Folder",
          slug: "Invalid Folder",
        },
        context,
      })
    ).toThrow();

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "folders.update",
        state,
        input: {
          folderId: "blog",
          values: { slug: "invalid/folder" },
        },
        context,
      })
    ).toThrow();
  });
});

describe("builder runtime read families", () => {
  test("keeps instance lists compact and paginates verbose expansion", () => {
    const instances: BuilderState["instances"] = new Map(state.instances);
    const largeState: BuilderState = {
      ...state,
      instances,
    };
    instances.set("body", {
      ...state.instances.get("body")!,
      children: [
        ...Array.from({ length: 100 }, (_, index) => ({
          type: "id" as const,
          value: `repeated-child-${index}-${"detail-".repeat(10)}`,
        })),
        { type: "id" as const, value: "heading" },
      ],
    });
    const compact = listInstances(largeState, { limit: 1 });
    const verbose = listInstances(largeState, { limit: 1, verbose: true });

    expect(compact).toMatchObject({
      detail: "compact",
      total: 2,
      returnedCount: 1,
      nextCursor: "1",
      instances: [{ id: "body" }],
    });
    expect(compact.instances[0]).not.toHaveProperty("record");
    expect(verbose).toMatchObject({
      detail: "verbose",
      total: compact.total,
      returnedCount: compact.returnedCount,
      nextCursor: compact.nextCursor,
      instances: [
        expect.objectContaining({
          ...compact.instances[0],
          record: expect.objectContaining({ id: "body" }),
        }),
      ],
    });
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(verbose).length * 0.5
    );
  });

  test("reads instances and text nodes", () => {
    expect(
      executeBuilderRuntimeOperation({
        id: "instances.list",
        state,
        input: { pageId: "home" },
        context,
      })
    ).toMatchObject({
      instances: [
        { id: "body", depth: 0 },
        {
          id: "heading",
          depth: 1,
          label: "Hero",
          parentId: "body",
          indexWithinParent: 0,
        },
      ],
    });

    const inspectedInstance = inspectInstance(state, {
      instanceId: "heading",
      include: ["props", "styles", "sources", "ancestors"],
    });
    expect(inspectedInstance).toMatchObject({
      id: "heading",
      parentId: "body",
      indexWithinParent: 0,
      ancestors: [{ id: "body", childIndex: 0 }],
      sources: ["token", "local"],
    });
    expect(inspectedInstance.styles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: "heading", property: "color" }),
      ])
    );
    expect(inspectedInstance.props).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "prop" })])
    );

    expect(listTextInstances(state, { contains: "Hello" })).toMatchObject({
      texts: [{ instanceId: "heading", childIndex: 0, value: "Hello" }],
    });
  });

  test("builds text update mutations", () => {
    expect(
      updateTextInstance(state, {
        instanceId: "heading",
        childIndex: 0,
        text: "Updated",
      })
    ).toMatchObject({
      kind: "mutation",
      noop: false,
      payload: [
        {
          namespace: "instances",
          patches: [
            {
              op: "replace",
              path: ["heading", "children", 0],
              value: { type: "text", value: "Updated" },
            },
          ],
        },
      ],
      result: { instanceId: "heading", childIndex: 0, mode: "text" },
    });

    expect(
      updateTextInstance(state, {
        instanceId: "heading",
        childIndex: 0,
        text: "Hello",
      })
    ).toMatchObject({
      noop: true,
      payload: [],
      result: { instanceId: "heading", childIndex: 0, mode: "text" },
    });
  });

  test("replaces bounded literal text through the public runtime operation", () => {
    const replaceState = {
      ...state,
      instances: new Map<
        string,
        NonNullable<BuilderState["instances"]> extends Map<
          string,
          infer Instance
        >
          ? Instance
          : never
      >([
        ...state.instances,
        [
          "subtitle",
          {
            type: "instance" as const,
            id: "subtitle",
            component: "Text",
            tag: "p",
            children: [{ type: "text" as const, value: "Hello from Acme" }],
          },
        ],
      ]),
    } satisfies BuilderState;

    expect(
      executeBuilderRuntimeOperation({
        id: "instances.replaceText",
        state: replaceState,
        input: {
          find: "Hello",
          replace: "Welcome",
          match: "substring",
          limit: 1,
        },
        context,
      })
    ).toMatchObject({
      kind: "mutation",
      result: {
        changedCount: 1,
        matchingChildCount: 2,
        truncated: true,
        matches: [
          {
            instanceId: "heading",
            childIndex: 0,
            before: "Hello",
            after: "Welcome",
          },
        ],
      },
      payload: [
        {
          namespace: "instances",
          patches: [
            {
              op: "replace",
              path: ["heading", "children", 0],
              value: { type: "text", value: "Welcome" },
            },
          ],
        },
      ],
    });
  });

  test("builds prop mutations", () => {
    expect(
      updateProps(
        state,
        {
          updates: [
            {
              instanceId: "heading",
              name: "title",
              type: "string",
              value: "Updated",
            },
          ],
        },
        context
      )
    ).toMatchObject({
      kind: "mutation",
      noop: false,
      result: { propIds: ["prop"] },
      payload: [{ namespace: "props" }],
    });

    expect(
      bindProps(
        state,
        {
          bindings: [
            {
              instanceId: "heading",
              name: "title",
              binding: { type: "expression", value: "title" },
            },
          ],
        },
        context
      )
    ).toMatchObject({
      result: { propIds: ["prop"] },
      payload: [{ namespace: "props" }],
    });

    expect(
      deleteProps(state, {
        deletions: [{ instanceId: "heading", name: "src" }],
      })
    ).toMatchObject({
      result: { propIds: ["resourceProp"] },
      payload: [{ namespace: "props" }, { namespace: "resources" }],
    });
  });

  test("binds readable expression names to data sources at write time", () => {
    const propResult = executeBuilderRuntimeOperation({
      id: "instances.bindProps",
      state,
      input: {
        bindings: [
          {
            instanceId: "heading",
            name: "title",
            binding: { type: "expression", value: "Title" },
          },
        ],
      },
      context,
    });
    expect(propResult).toMatchObject({
      payload: [
        {
          namespace: "props",
          patches: [
            {
              value: {
                type: "expression",
                value: "$ws$dataSource$variable",
              },
            },
          ],
        },
      ],
    });

    const textResult = executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state,
      input: {
        instanceId: "heading",
        childIndex: 0,
        text: 'Title ?? "Untitled"',
        mode: "expression",
      },
      context,
    });
    expect(textResult).toMatchObject({
      payload: [
        {
          namespace: "instances",
          patches: [
            {
              value: {
                type: "expression",
                value: '$ws$dataSource$variable ?? "Untitled"',
              },
            },
          ],
        },
      ],
    });

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "instances.updateText",
        state,
        input: {
          instanceId: "heading",
          childIndex: 0,
          text: "$ws$dataSource$stale.name",
          mode: "expression",
        },
        context,
      })
    ).toThrow(/data source "stale".*not available/);
  });

  test("returns non-blocking expression warnings with actionable locations", () => {
    const text = executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state,
      input: {
        instanceId: "heading",
        childIndex: 0,
        text: "missingTitle",
        mode: "expression",
      },
      context,
    });
    expect(getMutationResult(text)).toMatchObject({
      warnings: [
        {
          code: "expression_lint_warning",
          path: ["text"],
          instanceId: "heading",
          range: { from: 0, to: 12 },
          remediation: expect.stringContaining("available"),
        },
      ],
    });

    const prop = executeBuilderRuntimeOperation({
      id: "instances.bindProps",
      state,
      input: {
        bindings: [
          {
            instanceId: "heading",
            name: "title",
            binding: { type: "expression", value: "missingTitle" },
          },
          {
            instanceId: "heading",
            name: "onClick",
            binding: {
              type: "action",
              value: [
                {
                  type: "execute",
                  args: ["event"],
                  code: "missingValue = event",
                },
              ],
            },
          },
        ],
      },
      context,
    });
    expect(getMutationResult(prop)).toMatchObject({
      warnings: [
        expect.objectContaining({
          path: ["bindings", "0", "binding", "value"],
          instanceId: "heading",
        }),
        expect.objectContaining({
          path: ["bindings", "1", "binding", "value", "0", "code"],
          instanceId: "heading",
        }),
      ],
    });

    const resource = executeBuilderRuntimeOperation({
      id: "resources.create",
      state,
      input: {
        resource: {
          name: "Create post",
          method: "post",
          url: "https://api.example.com/posts",
          headers: [],
          body: "missingPayload",
        },
      },
      context: {
        ...context,
        createId: (() => {
          const ids = ["warning-resource", "warning-data-source"];
          return () => ids.shift() ?? "id";
        })(),
      },
    });
    expect(getMutationResult(resource)).toMatchObject({
      warnings: [
        expect.objectContaining({
          path: ["resource", "body"],
          resourceId: "warning-resource",
        }),
      ],
    });

    const collection = executeBuilderRuntimeOperation({
      id: "instances.insertCollection",
      state,
      input: {
        parentInstanceId: "body",
        data: { type: "json", value: [{ name: "Starter" }] },
        itemFragment: {
          children: [{ type: "id", value: "item" }],
          instances: [
            {
              type: "instance",
              id: "item",
              component: "Text",
              children: [
                { type: "expression", value: "collectionItem.name" },
                { type: "expression", value: "missingCollectionItem.name" },
              ],
            },
          ],
          props: [],
          dataSources: [],
          resources: [],
          styleSources: [],
          styleSourceSelections: [],
          styles: [],
          breakpoints: [],
          assets: [],
        },
      },
      context: {
        ...context,
        createId: (() => {
          const ids = [
            "collection",
            "collection-data-prop",
            "collection-item",
            "collection-item-key",
          ];
          return () => ids.shift() ?? "generated-id";
        })(),
      },
    });
    expect(getMutationResult(collection)).toMatchObject({
      warnings: [
        expect.objectContaining({
          path: ["itemFragment", "instances", "0", "children", "1", "value"],
          message: expect.stringContaining("missingCollectionItem"),
        }),
      ],
    });

    try {
      executeBuilderRuntimeOperation({
        id: "instances.bindProps",
        state,
        input: {
          bindings: [
            {
              instanceId: "heading",
              name: "onClick",
              binding: {
                type: "action",
                value: [{ type: "execute", args: ["event"], code: "event +" }],
              },
            },
          ],
        },
        context,
      });
      expect.unreachable("Expected invalid action syntax to be rejected");
    } catch (error) {
      expect(error).toMatchObject({
        code: "INVALID_INPUT",
        issues: [
          expect.objectContaining({
            path: ["bindings", "0", "binding", "value"],
            detail: expect.stringMatching(/Unexpected token/),
          }),
        ],
      });
    }
  });

  test("binds Collection data and item names in their respective scopes", () => {
    const collectionState = {
      ...state,
      instances: new Map([
        [
          "body",
          {
            type: "instance" as const,
            id: "body",
            component: "Body",
            children: [{ type: "id" as const, value: "collection" }],
          },
        ],
        [
          "collection",
          {
            type: "instance" as const,
            id: "collection",
            component: "ws:collection",
            children: [{ type: "id" as const, value: "item" }],
          },
        ],
        [
          "item",
          {
            type: "instance" as const,
            id: "item",
            component: "Text",
            children: [{ type: "text" as const, value: "Item" }],
          },
        ],
      ]),
      props: new Map(),
      dataSources: new Map([
        [
          "plans",
          {
            id: "plans",
            type: "variable" as const,
            name: "Plans",
            scopeInstanceId: "body",
            value: { type: "json" as const, value: [{ name: "Starter" }] },
          },
        ],
        [
          "item-parameter",
          {
            id: "item-parameter",
            type: "parameter" as const,
            name: "collectionItem",
            scopeInstanceId: "collection",
          },
        ],
      ]),
    } satisfies BuilderState;

    expect(
      executeBuilderRuntimeOperation({
        id: "instances.bindProps",
        state: collectionState,
        input: {
          bindings: [
            {
              instanceId: "collection",
              name: "data",
              binding: { type: "expression", value: "Plans" },
            },
          ],
        },
        context,
      })
    ).toMatchObject({
      result: { propIds: ["id"] },
      payload: [
        {
          namespace: "props",
          patches: [
            {
              value: {
                value: "$ws$dataSource$plans",
              },
            },
          ],
        },
      ],
    });

    const validItemBinding = executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state: collectionState,
      input: {
        instanceId: "item",
        childIndex: 0,
        text: "collectionItem.name",
        mode: "expression",
      },
      context,
    });
    expect(validItemBinding).toMatchObject({
      payload: [
        {
          namespace: "instances",
          patches: [
            {
              value: {
                value: "$ws$dataSource$item__DASH__parameter.name",
              },
            },
          ],
        },
      ],
    });

    const invalidItemBinding = executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state: collectionState,
      input: {
        instanceId: "item",
        childIndex: 0,
        text: "missingCollectionItem.name",
        mode: "expression",
      },
      context,
    });
    expect(getMutationResult(invalidItemBinding)).toMatchObject({
      warnings: [
        expect.objectContaining({
          path: ["text"],
          instanceId: "item",
          message: expect.stringContaining("missingCollectionItem"),
        }),
      ],
    });
  });

  test("replaces bounded static prop text without changing dynamic bindings", () => {
    const replaceState = {
      ...state,
      props: new Map<
        string,
        NonNullable<BuilderState["props"]> extends Map<string, infer Prop>
          ? Prop
          : never
      >([
        ...state.props,
        [
          "expression-prop",
          {
            id: "expression-prop",
            instanceId: "heading",
            name: "title",
            type: "expression" as const,
            value: "Heading",
          },
        ],
      ]),
    } satisfies BuilderState;

    expect(
      executeBuilderRuntimeOperation({
        id: "instances.replacePropText",
        state: replaceState,
        input: {
          find: "Heading",
          replace: "Welcome",
          match: "exact",
          names: ["title"],
          limit: 1,
        },
        context,
      })
    ).toMatchObject({
      kind: "mutation",
      result: {
        changedCount: 1,
        matchingPropCount: 1,
        truncated: false,
        matches: [
          {
            propId: "prop",
            instanceId: "heading",
            name: "title",
            before: "Heading",
            after: "Welcome",
          },
        ],
      },
      payload: [
        {
          namespace: "props",
          patches: [
            {
              op: "replace",
              path: ["prop", "value"],
              value: "Welcome",
            },
          ],
        },
      ],
    });
  });

  test("deletes multiple props through the public runtime operation", () => {
    expect(
      executeBuilderRuntimeOperation({
        id: "instances.deleteProps",
        state,
        input: {
          deletions: [
            { instanceId: "heading", name: "title" },
            { instanceId: "heading", name: "aria-label" },
          ],
        },
        context,
      })
    ).toMatchObject({
      result: { propIds: ["prop", "labelProp"] },
      payload: [
        {
          namespace: "props",
          patches: [
            { op: "remove", path: ["prop"] },
            { op: "remove", path: ["labelProp"] },
          ],
        },
      ],
    });
  });

  test("reads styles, tokens, variables, and resources", () => {
    const declarations = getStyleDeclarations(state, {
      instanceIds: ["heading"],
    });
    expect(declarations.declarations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: "heading", property: "color" }),
      ])
    );
    expect(listDesignTokens(state, { withUsage: true })).toMatchObject({
      tokens: [{ id: "token", declarationCount: 1, usageCount: 1 }],
    });
    expect(
      listDesignTokens(state, { withUsage: true, verbose: true })
    ).toMatchObject({
      tokens: [{ id: "token", styles: { color: expect.any(Object) } }],
    });
    expect(listCssVariables(state, { withUsage: true })).toMatchObject({
      vars: [{ name: "--brand-color", scope: "heading", usageCount: 1 }],
    });
    expect(listDataVariables(state)).toMatchObject({
      variables: [{ id: "variable", scopeInstanceId: "heading" }],
    });
    expect(listResources(state)).toMatchObject({
      resources: [{ id: "resource", dataSourceId: "resourceDataSource" }],
    });
  });

  test("lists uploaded font families separately from system font stacks", () => {
    const assets: Assets = new Map(state.assets);
    assets.set("font", {
      id: "font",
      projectId: "project",
      name: "acme-sans.woff2",
      type: "font",
      size: 1,
      format: "woff2",
      createdAt: "2026-01-01T00:00:00.000Z",
      description: null,
      meta: { family: "Acme Sans", style: "normal", weight: 400 },
    });
    const fontState = {
      ...state,
      assets,
    } satisfies BuilderState;

    expect(listFonts(fontState, { includeSystem: false })).toEqual({
      uploaded: [
        {
          family: "Acme Sans",
          source: "uploaded",
          assets: [
            {
              assetId: "font",
              format: "woff2",
              style: "normal",
              weight: 400,
              variable: false,
            },
          ],
        },
      ],
      system: [],
    });

    expect(
      executeBuilderRuntimeOperation({
        id: "fonts.list",
        state: fontState,
        input: {},
        context,
      })
    ).toMatchObject({
      uploaded: [{ family: "Acme Sans" }],
      system: expect.arrayContaining([
        expect.objectContaining({ family: "System UI", source: "system" }),
      ]),
    });
  });

  test("validates data variable mutations through public operations", () => {
    expect(
      executeBuilderRuntimeOperation({
        id: "variables.create",
        state,
        input: {
          scopeInstanceId: "heading",
          name: "Subtitle",
          value: { type: "string", value: "Hello" },
        },
        context,
      })
    ).toMatchObject({
      kind: "mutation",
      result: { dataSourceId: "id" },
      payload: [{ namespace: "dataSources" }],
    });

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "variables.create",
        state,
        input: {
          scopeInstanceId: "heading",
          name: "Title",
          value: { type: "string", value: "Hello" },
        },
        context,
      })
    ).toThrow("Name is already used by another variable on this instance");

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "variables.update",
        state,
        input: {
          dataSourceId: "variable",
          values: { name: "" },
        },
        context,
      })
    ).toThrow();
  });

  test("validates style mutation inputs through shared runtime schemas", () => {
    const updates = [
      {
        instanceId: "heading",
        property: "box-shadow",
        value: { type: "keyword", value: "none" },
      },
    ];
    expect(
      executeBuilderRuntimeOperation({
        id: "styles.updateDeclarations",
        state,
        input: { updates: JSON.stringify(updates) },
        context,
      })
    ).toMatchObject({
      result: { styleKeys: expect.arrayContaining(["local:base:boxShadow:"]) },
    });

    const deletions = [{ instanceId: "heading", property: "color" }];
    expect(
      executeBuilderRuntimeOperation({
        id: "styles.deleteDeclarations",
        state,
        input: { deletions: JSON.stringify(deletions) },
        context,
      })
    ).toMatchObject({
      result: { styleKeys: ["local:base:color:"] },
    });

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "styles.updateDeclarations",
        state,
        input: { updates: { instanceId: "heading" } },
        context,
      })
    ).toThrow();

    const tokenUpdates = [
      {
        property: "font-size",
        value: { type: "unit", value: 16, unit: "px" },
      },
    ];
    expect(
      executeBuilderRuntimeOperation({
        id: "designTokens.updateStyles",
        state,
        input: {
          designTokenId: "token",
          updates: JSON.stringify(tokenUpdates),
        },
        context,
      })
    ).toMatchObject({
      result: { designTokenId: "token", styleKeys: ["token:base:fontSize:"] },
    });

    const tokenDeletions = [{ property: "color" }];
    expect(
      executeBuilderRuntimeOperation({
        id: "designTokens.deleteStyles",
        state,
        input: {
          designTokenId: "token",
          deletions: JSON.stringify(tokenDeletions),
        },
        context,
      })
    ).toMatchObject({
      result: { designTokenId: "token", styleKeys: ["token:base:color:"] },
    });

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "designTokens.updateStyles",
        state,
        input: {
          designTokenId: "token",
          updates: { property: "color" },
        },
        context,
      })
    ).toThrow();
  });

  test("validates asset update mutations through the public runtime operation", () => {
    expect(
      executeBuilderRuntimeOperation({
        id: "assets.update",
        state,
        input: {
          assetId: "asset",
          values: {
            filename: "Updated",
            description: "Updated description",
          },
        },
        context,
      })
    ).toMatchObject({
      kind: "mutation",
      result: { assetId: "asset" },
      payload: [
        {
          namespace: "assets",
          patches: [
            { op: "add", path: ["asset", "filename"], value: "Updated" },
            {
              op: "replace",
              path: ["asset", "description"],
              value: "Updated description",
            },
          ],
        },
      ],
    });

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "assets.update",
        state,
        input: {
          assetId: "asset",
          values: { filename: "bad/name" },
        },
        context,
      })
    ).toThrow("Invalid filename");

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "assets.update",
        state,
        input: {
          assetId: "asset",
          values: { filename: "Hero" },
        },
        context,
      })
    ).toThrow("Filename already used");
  });

  test("validates resource URL mutations through the public runtime operation", () => {
    expectRuntimeValidationError(
      "resources.create",
      {
        scopeInstanceId: "heading",
        resource: {
          name: "Users",
          method: "get",
          url: `"not-a-url"`,
          headers: [],
        },
      },
      {
        path: ["resource", "url"],
        constraint: "absolute_or_root_relative_url",
      }
    );

    expectRuntimeValidationError(
      "resources.update",
      {
        resourceId: "resource",
        values: { url: `""` },
      },
      {
        path: ["values", "url"],
        constraint: "absolute_or_root_relative_url",
      }
    );

    const fixedUrlResult = executeBuilderRuntimeOperation({
      id: "resources.create",
      state,
      input: {
        scopeInstanceId: "heading",
        resource: {
          name: "Users",
          method: "get",
          url: "https://api.example.com/users",
          headers: [],
        },
      },
      context: {
        ...context,
        createId: (() => {
          const ids = ["fixed-resource-id", "fixed-data-source-id"];
          return () => ids.shift() ?? "id";
        })(),
      },
    });

    expect(fixedUrlResult).toMatchObject({
      payload: expect.arrayContaining([
        {
          namespace: "resources",
          patches: expect.arrayContaining([
            expect.objectContaining({
              value: expect.objectContaining({
                url: `"https://api.example.com/users"`,
              }),
            }),
          ]),
        },
      ]),
    });

    const literalRequestValuesResult = executeBuilderRuntimeOperation({
      id: "resources.create",
      state,
      input: {
        scopeInstanceId: "heading",
        resource: {
          name: "Literal request values",
          method: "post",
          url: "https://api.example.com/users",
          searchParams: [
            {
              name: "source",
              value: { type: "literal", value: "website" },
            },
          ],
          headers: [
            {
              name: "Content-Type",
              value: { type: "literal", value: "application/json" },
            },
          ],
          body: { type: "literal", value: "Plain text body" },
        },
      },
      context: {
        ...context,
        createId: (() => {
          const ids = ["literal-resource-id", "literal-data-source-id"];
          return () => ids.shift() ?? "id";
        })(),
      },
    });

    expect(literalRequestValuesResult).toMatchObject({
      payload: expect.arrayContaining([
        {
          namespace: "resources",
          patches: expect.arrayContaining([
            expect.objectContaining({
              value: expect.objectContaining({
                url: '"https://api.example.com/users"',
                searchParams: [{ name: "source", value: '"website"' }],
                headers: [
                  { name: "Content-Type", value: '"application/json"' },
                ],
                body: '"Plain text body"',
              }),
            }),
          ]),
        },
      ]),
    });

    const dynamicUrlResult = executeBuilderRuntimeOperation({
      id: "resources.upsert",
      state,
      input: {
        scopeInstanceId: "heading",
        resource: {
          name: "Users",
          method: "get",
          url: "apiUrl",
          headers: [],
        },
      },
      context: {
        ...context,
        createId: (() => {
          const ids = ["resource-id", "data-source-id"];
          return () => ids.shift() ?? "id";
        })(),
      },
    });

    expect(dynamicUrlResult).toMatchObject({
      kind: "mutation",
      result: { resourceId: "resource-id", dataSourceId: "data-source-id" },
    });
  });

  test("replaces bounded fixed resource URLs without changing expressions", () => {
    const resource = state.resources.get("resource");
    if (resource === undefined) {
      throw new Error("Expected test resource");
    }
    const replaceState = {
      ...state,
      resources: new Map([
        [
          "resource",
          {
            ...resource,
            url: '"https://api.old.example.com/posts"',
          },
        ],
        [
          "dynamic-resource",
          {
            ...resource,
            id: "dynamic-resource",
            name: "Dynamic posts",
            url: "apiBase + '/posts'",
          },
        ],
      ]),
    } satisfies BuilderState;

    expect(
      executeBuilderRuntimeOperation({
        id: "resources.replaceText",
        state: replaceState,
        input: {
          find: "/posts",
          replace: "/articles",
          match: "substring",
          fields: ["url"],
          limit: 1,
        },
        context,
      })
    ).toMatchObject({
      kind: "mutation",
      result: {
        changedCount: 1,
        matchingFieldCount: 1,
        truncated: false,
        matches: [
          {
            resourceId: "resource",
            field: "url",
            before: "https://api.old.example.com/posts",
            after: "https://api.old.example.com/articles",
          },
        ],
      },
      payload: [
        {
          namespace: "resources",
          patches: [
            {
              op: "replace",
              path: ["resource", "url"],
              value: '"https://api.old.example.com/articles"',
            },
          ],
        },
      ],
    });
  });

  test("validates project settings and redirects through public operations", () => {
    expectRuntimeValidationError(
      "projectSettings.update",
      { meta: { contactEmail: "not-an-email" } },
      {
        code: "invalid_contact_email",
        path: ["meta", "contactEmail"],
        constraint: "comma_separated_email_addresses",
      }
    );

    expectRuntimeValidationError(
      "projectSettings.update",
      {
        meta: {
          auth: JSON.stringify({
            version: 1,
            routes: {
              private: {
                method: "basic",
                login: "admin",
                password: "secret",
              },
            },
          }),
        },
      },
      {
        code: "invalid_project_auth",
        path: ["meta", "auth"],
        constraint: "valid_webstudio_auth_json",
      }
    );

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "redirects.create",
        state,
        input: {
          old: "/old#fragment",
          new: "/other",
        },
        context,
      })
    ).toThrow("Redirect already exists");

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "redirects.setAll",
        state,
        input: {
          redirects: [
            { old: "/über", new: "/one" },
            { old: "/%C3%BCber", new: "/two" },
          ],
        },
        context,
      })
    ).toThrow('Duplicate redirect source "/%C3%BCber"');
  });

  test("validates breakpoint mutations through public operations", () => {
    expect(() =>
      executeBuilderRuntimeOperation({
        id: "breakpoints.create",
        state,
        input: {
          label: "Broken",
          minWidth: -1,
        },
        context,
      })
    ).toThrow();

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "breakpoints.update",
        state,
        input: {
          breakpointId: "base",
          values: { label: "New base" },
        },
        context,
      })
    ).toThrow("Base breakpoint cannot be updated");

    const breakpoints = new Map(state.breakpoints);
    for (let index = 0; index < 7; index += 1) {
      breakpoints.set(`extra-${index}`, {
        id: `extra-${index}`,
        label: `Extra ${index}`,
        minWidth: index + 1,
      });
    }

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "breakpoints.create",
        state: { ...state, breakpoints },
        input: {
          label: "Overflow",
          minWidth: 1200,
        },
        context,
      })
    ).toThrow("Breakpoint limit reached");
  });
});

describe("builder runtime registry", () => {
  test("exposes complete metadata from executable runtime operations", () => {
    for (const operation of builderRuntimeOperations) {
      expect(operation.id).toMatch(/^[a-z]+[A-Za-z]*\.[a-z]+[A-Za-z]*$/);
      expect(operation.command).toMatch(/^[a-z][a-z-]+$/);
      expect(operation.client).toMatch(/^[a-z][A-Za-z]+$/);
      const metadata = getInputJsonSchemaMetadata(operation.inputJsonSchema);
      expect(metadata.inputFields).not.toContain("projectId");
      for (const field of Object.keys(metadata.inputFieldTypes)) {
        expect(metadata.inputFields).toContain(field);
      }

      if (operation.kind === "read") {
        expect(operation.writeNamespaces).toEqual([]);
        expect(operation.invalidatesNamespaces).toEqual([]);
        expect(operation.requiresConfirm).toBe(false);
      }

      if (operation.kind === "mutation") {
        expect(
          operation.writeNamespaces.length +
            operation.invalidatesNamespaces.length
        ).toBeGreaterThan(0);
      }
    }
  });

  test("publishes truthful inputs for asset, page-copy, style-source, and resource operations", () => {
    const addAssetOperation = getBuilderRuntimeOperation("assets.add");
    const addAssetSchema = toInputJsonSchemaObject(
      addAssetOperation.inputJsonSchema
    );
    const assetSchema = toInputJsonSchemaObject(
      addAssetSchema?.properties?.asset
    );
    expect(JSON.stringify(assetSchema)).not.toContain("projectId");

    for (const operationId of [
      "resources.create",
      "resources.update",
    ] as const) {
      const operation = getBuilderRuntimeOperation(operationId);
      const schema = toInputJsonSchemaObject(operation.inputJsonSchema);
      expect(
        toInputJsonSchemaObject(schema?.properties?.exposeAsDataSource)
          ?.description
      ).toContain("write resources default to false");
    }

    const copyPageOperation = getBuilderRuntimeOperation("pages.copy");
    const copyPageSchema = toInputJsonSchemaObject(
      copyPageOperation.inputJsonSchema
    );
    expect(copyPageSchema?.required).toContain("sourceData");
    expect(
      toInputJsonSchemaObject(copyPageSchema?.properties?.sourceData)
        ?.description
    ).toContain("use duplicate-page");
    expectRuntimeValidationError(
      "pages.copy",
      { pageId: "home" },
      { path: ["sourceData"] }
    );

    const duplicateStyleSourceOperation = getBuilderRuntimeOperation(
      "styleSources.duplicate"
    );
    const duplicateStyleSourceSchema = toInputJsonSchemaObject(
      duplicateStyleSourceOperation.inputJsonSchema
    );
    expect(
      toInputJsonSchemaObject(
        duplicateStyleSourceSchema?.properties?.styleSourceId
      )?.description
    ).toContain("Local style sources cannot be duplicated");
  });

  test("keeps router adapter policy in runtime metadata", () => {
    for (const operation of builderRuntimeOperations) {
      expect(operation.requiresAssets).toBe(
        operation.readNamespaces.includes("assets") ||
          operation.writeNamespaces.includes("assets")
      );
    }
    expect(
      builderRuntimeOperations
        .filter((operation) => operation.requiresConfirm)
        .map((operation) => operation.id)
    ).toEqual(["cssVariables.delete"]);
  });

  test("rejects client-supplied generated ids and hides generated id fields", () => {
    expect(runtimeGeneratedIdInput.safeParse(undefined).success).toBe(true);
    expect(runtimeGeneratedIdInput.safeParse("client-created-id").success).toBe(
      false
    );

    let generatedIdFieldCount = 0;

    for (const operation of builderRuntimeOperations) {
      const generatedIdPaths = getRuntimeGeneratedInputPaths(
        operation.inputSchema
      );
      if (generatedIdPaths.length === 0) {
        continue;
      }

      for (const path of generatedIdPaths) {
        generatedIdFieldCount += 1;
        if (path.length === 1) {
          expect(
            getInputJsonSchemaMetadata(operation.inputJsonSchema).inputFields
          ).not.toContain(path[0]);
        }
        let inputJsonSchema = operation.inputJsonSchema;
        for (const segment of path.slice(0, -1)) {
          const prefixItems = Array.isArray(inputJsonSchema.prefixItems)
            ? inputJsonSchema.prefixItems
            : undefined;
          inputJsonSchema =
            toInputJsonSchemaObject(
              segment === "*"
                ? (prefixItems?.[0] ?? inputJsonSchema.items)
                : inputJsonSchema.properties?.[segment]
            ) ?? {};
        }
        const hiddenField = path.at(-1);
        if (hiddenField !== undefined && hiddenField !== "*") {
          expect(hasDirectInputProperty(inputJsonSchema, hiddenField)).toBe(
            false
          );
        }
      }
    }

    expect(generatedIdFieldCount).toBeGreaterThan(0);
  });

  test("implements every cutover operation", () => {
    for (const manifest of builderRuntimeCutoverManifests) {
      for (const operationId of manifest.operationIds) {
        expect(getBuilderRuntimeOperation(operationId).id).toBe(operationId);
      }
    }
  });

  test("uses runtime context for ids in migrated mutations", () => {
    const duplicateWithDeterministicIds = () => {
      let nextId = 0;
      return executeBuilderRuntimeOperation({
        id: "pages.duplicate",
        state,
        input: {
          projectId: "project-1",
          pageId: "home",
          parentFolderId: "root",
        },
        context: {
          ...context,
          createId: () => `runtime-id-${++nextId}`,
        },
      });
    };

    expect(duplicateWithDeterministicIds()).toEqual(
      duplicateWithDeterministicIds()
    );
  });

  test("uses the default runtime context when none is provided", () => {
    const result = executeBuilderRuntimeOperation({
      id: "pages.create",
      state,
      input: {
        projectId: "project-1",
        name: "Generated Page",
        path: "/generated",
      },
    });

    expect(result).toMatchObject({
      kind: "mutation",
      payload: expect.arrayContaining([
        expect.objectContaining({ namespace: "pages" }),
      ]),
    });
  });

  test("validates every mutation input at the runtime boundary", () => {
    const invalidInputByOperation = new Map<string, unknown>([
      ["pages.create", {}],
      ["pages.update", {}],
      ["pages.updateSettings", {}],
      ["pages.updateMarketplace", {}],
      ["pages.savePathInHistory", {}],
      ["pages.setHome", {}],
      ["projectSettings.update", { meta: "invalid" }],
      ["projectSettings.updateMarketplaceProduct", {}],
      ["redirects.create", {}],
      ["redirects.update", {}],
      ["redirects.delete", {}],
      ["redirects.setAll", { redirects: {} }],
      ["breakpoints.create", {}],
      ["breakpoints.update", {}],
      ["breakpoints.delete", {}],
      ["pages.delete", {}],
      ["pages.duplicate", {}],
      ["pages.copy", {}],
      ["pageTemplates.create", {}],
      ["pageTemplates.update", {}],
      ["pageTemplates.delete", {}],
      ["pageTemplates.duplicate", {}],
      ["pageTemplates.reorder", {}],
      ["pageTemplates.createPage", {}],
      ["folders.create", {}],
      ["folders.update", {}],
      ["folders.delete", {}],
      ["folders.duplicate", {}],
      ["pageTransfer.insert", {}],
      ["pageTree.move", {}],
      ["pageTree.reparentOrphans", "invalid"],
      ["instances.insertComponent", { parentInstanceId: "body" }],
      ["instances.insertCollection", { parentInstanceId: "body" }],
      ["instances.insertFragment", { parentInstanceId: "body" }],
      ["instances.move", { moves: {} }],
      ["instances.reparent", {}],
      ["instances.fillGrid", {}],
      ["instances.wrap", {}],
      ["instances.convert", {}],
      ["instances.unwrap", {}],
      ["instances.clone", {}],
      ["instances.duplicateAfterItself", {}],
      ["instances.delete", { instanceIds: "heading" }],
      ["instances.deleteBySelector", {}],
      ["instances.updateProps", { updates: {} }],
      ["instances.replacePropText", {}],
      ["instances.deleteProps", { deletions: {} }],
      ["instances.bindProps", { bindings: {} }],
      ["instances.updateText", {}],
      ["instances.replaceText", {}],
      ["instances.setTextContent", { operation: "unknown" }],
      ["instances.updateTextTree", {}],
      ["instances.setTag", {}],
      ["instances.setLabel", {}],
      ["styles.updateDeclarations", { updates: {} }],
      ["styles.deleteDeclarations", { deletions: {} }],
      ["styles.updateSelectedDeclarations", { updates: {} }],
      ["styles.deleteSelectedDeclarations", { deletions: {} }],
      ["styles.replaceValues", {}],
      ["designTokens.create", { tokens: {} }],
      ["designTokens.createAttached", { tokens: {}, instanceIds: [] }],
      ["designTokens.updateStyles", { designTokenId: "token", updates: {} }],
      ["designTokens.deleteStyles", { designTokenId: "token", deletions: {} }],
      ["designTokens.attach", { designTokenId: "token", instanceIds: {} }],
      ["designTokens.detach", { designTokenId: "token", instanceIds: {} }],
      ["designTokens.extract", { instanceIds: {}, name: "Token" }],
      ["styleSources.rename", {}],
      ["styleSources.delete", {}],
      ["styleSources.setLock", {}],
      ["styleSources.reorder", {}],
      ["styleSources.clearStyles", {}],
      ["styleSources.duplicate", {}],
      ["styleSources.convertLocalToToken", {}],
      ["cssVariables.define", { vars: [] }],
      ["cssVariables.delete", { names: "--color" }],
      ["cssVariables.rewriteRefs", { map: [] }],
      ["cssVariables.rename", {}],
      ["variables.create", {}],
      ["variables.update", {}],
      ["variables.delete", {}],
      ["variables.deleteUnused", []],
      ["resources.create", {}],
      ["resources.update", {}],
      ["resources.replaceText", {}],
      ["resources.upsert", {}],
      ["resources.upsertProp", {}],
      ["resources.delete", {}],
      ["assets.update", {}],
      ["assets.setImageDescriptions", {}],
      ["assets.add", {}],
      ["assets.replace", {}],
      ["assets.delete", { assetIdsOrPrefixes: "asset" }],
    ]);

    expect(Array.from(invalidInputByOperation.keys())).toEqual(
      mutationOperationIds
    );

    for (const [operationId, input] of invalidInputByOperation) {
      expectRuntimeValidationError(operationId, input);
    }
  });

  test("returns actionable issues for semantic input relationships", () => {
    const cases: Array<[string, unknown, Partial<SemanticValidationIssue>]> = [
      [
        "projectSettings.update",
        {},
        {
          code: "empty_project_settings_update",
          path: [],
          constraint: "at_least_one_of:meta,compiler",
        },
      ],
      [
        "assets.update",
        { assetId: "asset", values: {} },
        {
          code: "empty_asset_update",
          path: ["values"],
          constraint: "at_least_one_property",
        },
      ],
      [
        "assets.setImageDescriptions",
        {
          updates: [
            { assetId: "asset", decorative: true },
            { assetId: "asset", decorative: true },
          ],
        },
        {
          code: "duplicate_asset_update",
          path: ["updates", "1", "assetId"],
          constraint: "unique_by:assetId",
        },
      ],
      [
        "resources.create",
        {
          exposeAsDataSource: true,
          resource: {
            name: "Posts",
            method: "get",
            url: "https://api.example.com/posts",
            headers: [],
          },
        },
        {
          code: "missing_resource_scope",
          path: ["scopeInstanceId"],
          constraint: "required_when:exposeAsDataSource=true",
        },
      ],
      [
        "instances.move",
        {
          moves: [
            {
              instanceId: "heading",
              parentInstanceId: "body",
              insertIndex: 0,
              position: "end",
            },
          ],
        },
        {
          code: "conflicting_move_position",
          path: ["moves", "0", "position"],
          constraint: "mutually_exclusive_with:insertIndex",
        },
      ],
    ];

    for (const [operationId, input, issue] of cases) {
      expectRuntimeValidationError(operationId, input, issue);
    }
  });

  test("validates internal runtime operation inputs without exposing them publicly", () => {
    expect(
      builderRuntimeOperations.map((operation) => operation.id)
    ).not.toContain("system.migrateLoadedData");
    expectRuntimeValidationError(
      "system.migrateLoadedData",
      { unexpected: true },
      { constraint: "recognized_keys_only" }
    );
  });

  test("does not mutate caller state across representative public mutation surfaces", () => {
    const inputs = new Map<string, unknown>([
      ["pages.create", { projectId: "project-1", name: "Docs", path: "/docs" }],
      [
        "pages.duplicate",
        { projectId: "project-1", pageId: "home", parentFolderId: "root" },
      ],
      ["pages.update", { pageId: "home", values: { name: "Renamed Home" } }],
      ["pages.delete", { pageId: "post" }],
      [
        "folders.create",
        { name: "Docs", slug: "docs", parentFolderId: "root" },
      ],
      [
        "pageTemplates.create",
        {
          name: "Article Template",
          title: '"Article Template"',
          meta: { description: '"Reusable article"' },
        },
      ],
      ["redirects.create", { old: "/legacy", new: "/new" }],
      ["breakpoints.create", { label: "Tablet", maxWidth: 768 }],
      [
        "instances.updateText",
        { instanceId: "heading", childIndex: 0, text: "Updated" },
      ],
      ["instances.delete", { instanceIds: ["heading"] }],
      [
        "instances.move",
        {
          moves: [
            { instanceId: "heading", parentInstanceId: "body", insertIndex: 0 },
          ],
        },
      ],
      [
        "instances.clone",
        { sourceInstanceId: "heading", targetParentInstanceId: "body" },
      ],
      [
        "instances.duplicateAfterItself",
        { sourceInstanceId: "heading", parentInstanceId: "body" },
      ],
      ["instances.setLabel", { instanceId: "heading", label: "Updated hero" }],
      ["instances.setTag", { instanceId: "heading", tag: "h2" }],
      [
        "instances.updateProps",
        {
          updates: [
            {
              instanceId: "heading",
              name: "title",
              type: "string",
              value: "Updated title",
            },
          ],
        },
      ],
      [
        "instances.deleteProps",
        { deletions: [{ instanceId: "heading", name: "title" }] },
      ],
      [
        "styles.updateDeclarations",
        {
          updates: [
            {
              instanceId: "heading",
              property: "color",
              value: { type: "keyword", value: "green" },
            },
          ],
        },
      ],
      [
        "styles.deleteDeclarations",
        { deletions: [{ instanceId: "heading", property: "color" }] },
      ],
      [
        "designTokens.create",
        {
          tokens: [
            {
              name: "Accent",
              styles: { color: { type: "keyword", value: "green" } },
            },
          ],
        },
      ],
      [
        "variables.create",
        {
          scopeInstanceId: "heading",
          name: "Subtitle",
          value: { type: "string", value: "Hello" },
        },
      ],
      [
        "styleSources.rename",
        { styleSourceId: "token", name: "Updated Brand" },
      ],
      ["styleSources.setLock", { styleSourceId: "token", locked: true }],
      ["styleSources.clearStyles", { styleSourceId: "local" }],
      [
        "styleSources.duplicate",
        { instanceId: "heading", styleSourceId: "token" },
      ],
      [
        "designTokens.attach",
        { designTokenId: "token", instanceIds: ["heading"] },
      ],
      [
        "designTokens.detach",
        { designTokenId: "token", instanceIds: ["heading"] },
      ],
      [
        "cssVariables.define",
        { vars: { "--accent-color": { type: "keyword", value: "green" } } },
      ],
      [
        "cssVariables.rename",
        { oldName: "--brand-color", newName: "--main-color" },
      ],
      ["cssVariables.delete", { names: ["--brand-color"], force: true }],
      [
        "variables.update",
        {
          dataSourceId: "variable",
          values: { value: { type: "string", value: "Updated" } },
        },
      ],
      ["variables.delete", { dataSourceId: "variable" }],
      [
        "resources.update",
        { resourceId: "resource", values: { name: "Updated Posts" } },
      ],
      [
        "resources.create",
        {
          scopeInstanceId: "heading",
          resource: {
            name: "Users",
            method: "get",
            url: "https://api.example.com/users",
            headers: [],
            searchParams: [],
          },
        },
      ],
      ["resources.delete", { resourceId: "resource", force: true }],
      [
        "assets.update",
        {
          assetId: "asset",
          values: { filename: "Updated", description: "Updated description" },
        },
      ],
      [
        "assets.setImageDescriptions",
        {
          updates: [{ assetId: "asset", description: "Updated description" }],
        },
      ],
      ["assets.delete", { assetIdsOrPrefixes: ["asset"] }],
      ["assets.replace", { fromAssetId: "asset", toAssetId: "next" }],
    ]);

    for (const [id, input] of inputs) {
      const before = structuredClone(state);
      executeBuilderRuntimeOperation({ id, state, input, context });
      expect(state).toEqual(before);
    }
  });
});
