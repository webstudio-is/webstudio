import { describe, expect, test } from "vitest";
import {
  getInputJsonSchemaMetadata,
  toInputJsonSchemaObject,
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
import { getPage, listFolders, listPages } from "./pages";
import {
  getStyleDeclarations,
  listCssVariables,
  listDesignTokens,
} from "./styles";
import {
  inspectInstance,
  listTextInstances,
  updateTextInstance,
} from "./instances";
import { listDataVariables, listResources } from "./data";
import { bindProps, deleteProps, updateProps } from "./props";
import type { BuilderRuntimeContext } from "./context";
import type { BuilderState } from "../state/builder-state";

const context: BuilderRuntimeContext = {
  createId: () => "id",
};

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

const state = {
  pages: {
    homePageId: "home",
    rootFolderId: "root",
    redirects: [{ old: "/old", new: "/new", status: "301" }],
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          title: "Home",
          path: "",
          rootInstanceId: "body",
          meta: {},
        },
      ],
      [
        "post",
        {
          id: "post",
          name: "Post",
          title: "Post",
          path: "/post",
          rootInstanceId: "post-body",
          meta: {
            description: "Post description",
            excludePageFromSearch: "true",
          },
        },
      ],
    ]),
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home", "blog"],
        },
      ],
      [
        "blog",
        {
          id: "blog",
          name: "Blog",
          slug: "blog",
          children: ["post"],
        },
      ],
    ]),
  },
  instances: new Map([
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "Body",
        tag: "body",
        children: [{ type: "id", value: "heading" }],
      },
    ],
    [
      "heading",
      {
        type: "instance",
        id: "heading",
        component: "Text",
        tag: "h1",
        label: "Hero",
        children: [{ type: "text", value: "Hello" }],
      },
    ],
  ]),
  props: new Map([
    [
      "prop",
      {
        id: "prop",
        instanceId: "heading",
        name: "title",
        type: "string",
        value: "Heading",
      },
    ],
    [
      "labelProp",
      {
        id: "labelProp",
        instanceId: "heading",
        name: "aria-label",
        type: "string",
        value: "Heading label",
      },
    ],
    [
      "resourceProp",
      {
        id: "resourceProp",
        instanceId: "heading",
        name: "src",
        type: "resource",
        value: "resource",
      },
    ],
  ]),
  styleSources: new Map([
    ["local", { type: "local", id: "local" }],
    ["token", { type: "token", id: "token", name: "Brand" }],
  ]),
  styleSourceSelections: new Map([
    ["heading", { instanceId: "heading", values: ["token", "local"] }],
  ]),
  styles: new Map([
    [
      "local:base::color",
      {
        styleSourceId: "local",
        breakpointId: "base",
        state: undefined,
        property: "color",
        value: { type: "unparsed", value: "var(--brand-color)" },
      },
    ],
    [
      "local:base::--brand-color",
      {
        styleSourceId: "local",
        breakpointId: "base",
        state: undefined,
        property: "--brand-color",
        value: { type: "keyword", value: "red" },
      },
    ],
    [
      "token:base::color",
      {
        styleSourceId: "token",
        breakpointId: "base",
        state: undefined,
        property: "color",
        value: { type: "keyword", value: "blue" },
      },
    ],
  ]),
  dataSources: new Map([
    [
      "variable",
      {
        id: "variable",
        type: "variable",
        name: "Title",
        scopeInstanceId: "heading",
        value: { type: "string", value: "Hello" },
      },
    ],
    [
      "resourceDataSource",
      {
        id: "resourceDataSource",
        type: "resource",
        name: "Posts",
        scopeInstanceId: "heading",
        resourceId: "resource",
      },
    ],
  ]),
  resources: new Map([
    [
      "resource",
      {
        id: "resource",
        name: "Posts",
        method: "get",
        url: `"/posts"`,
        headers: [],
        searchParams: [],
      },
    ],
  ]),
  assets: new Map([
    [
      "asset",
      {
        id: "asset",
        projectId: "project",
        name: "asset.png",
        type: "image",
        size: 1,
        format: "png",
        createdAt: "2026-01-01T00:00:00.000Z",
        description: null,
        meta: { width: 100, height: 100 },
      },
    ],
    [
      "next",
      {
        id: "next",
        projectId: "project",
        name: "next.png",
        type: "image",
        size: 1,
        format: "png",
        createdAt: "2026-01-01T00:00:00.000Z",
        filename: "Hero",
        description: null,
        meta: { width: 100, height: 100 },
      },
    ],
  ]),
  breakpoints: new Map([
    ["base", { id: "base", label: "Base" }],
    ["desktop", { id: "desktop", label: "Desktop", minWidth: 1024 }],
  ]),
} satisfies BuilderState;

const expectRuntimeValidationError = (operationId: string, input: unknown) => {
  try {
    executeBuilderRuntimeOperation({
      id: operationId,
      state,
      input,
      context,
    });
  } catch (error) {
    expect(error).toMatchObject({ name: "ZodError" });
    return;
  }
  throw new Error(`Expected ${operationId} to reject invalid input`);
};

const mutationOperationIds = runtimeOperationContracts
  .filter((contract) => contract.kind === "mutation")
  .map((contract) => contract.id);

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
      listDesignTokens(state, { withUsage: true, includeStyles: true })
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
    expect(() =>
      executeBuilderRuntimeOperation({
        id: "resources.create",
        state,
        input: {
          scopeInstanceId: "heading",
          resource: {
            name: "Users",
            method: "get",
            url: `"not-a-url"`,
            headers: [],
          },
        },
        context,
      })
    ).toThrow("url: URL is invalid");

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "resources.update",
        state,
        input: {
          resourceId: "resource",
          values: { url: `""` },
        },
        context,
      })
    ).toThrow("url: URL is required");

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

  test("validates project settings and redirects through public operations", () => {
    expect(() =>
      executeBuilderRuntimeOperation({
        id: "projectSettings.update",
        state,
        input: {
          meta: { contactEmail: "not-an-email" },
        },
        context,
      })
    ).toThrow("Contact email is invalid.");

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "projectSettings.update",
        state,
        input: {
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
        context,
      })
    ).toThrow('routes."private": Route must start with "/"');

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
      ["instances.deleteProps", { deletions: {} }],
      ["instances.bindProps", { bindings: {} }],
      ["instances.updateText", {}],
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
      ["resources.upsert", {}],
      ["resources.upsertProp", {}],
      ["resources.delete", {}],
      ["assets.update", {}],
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

  test("validates internal runtime operation inputs without exposing them publicly", () => {
    expect(
      builderRuntimeOperations.map((operation) => operation.id)
    ).not.toContain("system.migrateLoadedData");
    expect(() =>
      executeBuilderRuntimeOperation({
        id: "system.migrateLoadedData",
        state,
        input: { unexpected: true },
        context,
      })
    ).toThrow(/unexpected/);
  });
});
