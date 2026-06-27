import { describe, expect, test } from "vitest";
import { builderRuntimeCutoverManifests } from "./cutover";
import {
  executeBuilderRuntimeOperation,
  getBuilderRuntimeOperation,
} from "./registry";
import { getPage, listFolders, listPages } from "./pages";
import { getStyleDeclarations, listDesignTokens } from "./styles";
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
  now: () => new Date("2026-01-01T00:00:00.000Z"),
};

const state = {
  pages: {
    homePageId: "home",
    rootFolderId: "root",
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
  assets: new Map(),
  breakpoints: new Map(),
} satisfies BuilderState;

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
        { id: "heading", depth: 1, label: "Hero" },
      ],
    });

    const inspectedInstance = inspectInstance(state, {
      instanceId: "heading",
      include: ["props", "styles", "sources"],
    });
    expect(inspectedInstance).toMatchObject({
      id: "heading",
      styles: [{ instanceId: "heading", property: "color" }],
      sources: ["token", "local"],
    });
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

  test("reads styles, tokens, variables, and resources", () => {
    expect(
      getStyleDeclarations(state, { instanceIds: ["heading"] })
    ).toMatchObject({
      declarations: [{ instanceId: "heading", property: "color" }],
    });
    expect(listDesignTokens(state, { withUsage: true })).toMatchObject({
      tokens: [{ id: "token", usageCount: 1 }],
    });
    expect(listDataVariables(state)).toMatchObject({
      variables: [{ id: "variable", scopeInstanceId: "heading" }],
    });
    expect(listResources(state)).toMatchObject({
      resources: [{ id: "resource", dataSourceId: "resourceDataSource" }],
    });
  });
});

describe("builder runtime registry", () => {
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
});
