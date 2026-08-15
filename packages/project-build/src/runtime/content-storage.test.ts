import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  encodeDataVariableId,
  portalComponent,
} from "@webstudio-is/sdk";
import type {
  ContentBlockExternalContentIdentity,
  Prop,
  WebstudioFragment,
} from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import {
  createContentStorageProjection,
  resolveContentStorageRoot,
} from "./content-storage";
import { executeBuilderRuntimeOperation } from "./registry";
import { createDefaultPages } from "../shared/pages-utils";

const identity = (
  renderScope: string,
  blockInstanceId = "block",
  assetId = "article"
): ContentBlockExternalContentIdentity => ({
  blockInstanceId,
  assetId,
  revision: "sha256:article",
  contentRef: "articles/post.mdx",
  format: "mdx",
  renderScope,
});

const fragment = (rootId: string): WebstudioFragment => ({
  children: [{ type: "id", value: rootId }],
  instances: [
    {
      type: "instance",
      id: rootId,
      component: elementComponent,
      tag: "p",
      children: [{ type: "text", value: "External content" }],
    },
  ],
  props: [],
  assets: [],
  dataSources: [],
  resources: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
});

const assetSource = (value = "article"): Prop => ({
  id: "src",
  instanceId: "block",
  name: "src",
  type: "asset",
  value,
});

const createState = (source: Prop = assetSource()): BuilderState => ({
  instances: new Map([
    [
      "block",
      {
        type: "instance",
        id: "block",
        component: blockComponent,
        children: [{ type: "id", value: "templates" }],
      },
    ],
    [
      "templates",
      {
        type: "instance",
        id: "templates",
        component: blockTemplateComponent,
        children: [],
      },
    ],
  ]),
  props: new Map([[source.id, source]]),
});

const createStructuralState = () => ({
  ...createState(),
  pages: createDefaultPages({ rootInstanceId: "block" }),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
  assets: new Map(),
});

const createIdFactory = () => {
  let index = 0;
  return () => `generated-${index++}`;
};

const createNestedMaterializedContent = () => {
  const parentIdentity = identity("page:/post");
  const nestedIdentity = identity(
    "page:/post:nested",
    "nested-block",
    "nested-article"
  );
  const parentFragment: WebstudioFragment = {
    ...fragment("outer-rich-text"),
    instances: [
      {
        type: "instance",
        id: "outer-rich-text",
        component: elementComponent,
        children: [{ type: "id", value: "nested-block" }],
      },
      {
        type: "instance",
        id: "nested-block",
        component: blockComponent,
        children: [{ type: "id", value: "nested-templates" }],
      },
      {
        type: "instance",
        id: "nested-templates",
        component: blockTemplateComponent,
        children: [],
      },
    ],
    props: [
      {
        id: "nested-src",
        instanceId: "nested-block",
        name: "src",
        type: "asset",
        value: "nested-article",
      },
    ],
  };
  return {
    parentIdentity,
    nestedIdentity,
    roots: [
      { identity: nestedIdentity, fragment: fragment("nested-content") },
      { identity: parentIdentity, fragment: parentFragment },
    ],
  };
};

describe.each([
  {
    sourceType: "direct",
    source: {
      id: "src",
      instanceId: "block",
      name: "src",
      type: "asset",
      value: "article",
    } satisfies Prop,
  },
  {
    sourceType: "dynamic",
    source: {
      id: "src",
      instanceId: "block",
      name: "src",
      type: "expression",
      value: "$ws$data$source",
    } satisfies Prop,
  },
])("$sourceType Content Block source", ({ source }) => {
  test("projects scope-local content without changing persisted instances", () => {
    const state = createState(source);
    const externalIdentity = identity(`scope-${source.type}`);
    const projection = createContentStorageProjection({
      state,
      materializedRoots: [
        {
          identity: externalIdentity,
          fragment: fragment(`root-${source.type}`),
        },
      ],
    });

    expect(projection.state.instances?.get("block")?.children).toEqual([
      { type: "id", value: "templates" },
      { type: "id", value: `root-${source.type}` },
    ]);
    expect(state.instances?.get("block")?.children).toEqual([
      { type: "id", value: "templates" },
    ]);
    expect(
      resolveContentStorageRoot(projection, {
        type: "instance",
        instanceId: `root-${source.type}`,
      })
    ).toEqual({ type: "external", identity: externalIdentity });
  });
});

test("resolves instance and child-list mutation targets to one storage root", () => {
  const state = createState();
  const externalIdentity = identity("page:/post");
  const projection = createContentStorageProjection({
    state,
    materializedRoots: [
      { identity: externalIdentity, fragment: fragment("external-root") },
    ],
  });

  expect(
    resolveContentStorageRoot(projection, {
      type: "children",
      parentInstanceId: "block",
    })
  ).toEqual({ type: "external", identity: externalIdentity });
  expect(
    resolveContentStorageRoot(projection, {
      type: "instance",
      instanceId: "block",
    })
  ).toEqual({ type: "project" });
  expect(
    resolveContentStorageRoot(projection, {
      type: "instance",
      instanceId: "templates",
    })
  ).toEqual({ type: "project" });
  expect(
    resolveContentStorageRoot(projection, {
      type: "children",
      parentInstanceId: "external-root",
    })
  ).toEqual({ type: "external", identity: externalIdentity });
});

test("preserves ordinary Content Block behavior without materialized content", () => {
  const state = createState();
  const projection = createContentStorageProjection({
    state,
    materializedRoots: [],
  });

  expect(projection.state).toBe(state);
  expect(
    resolveContentStorageRoot(projection, {
      type: "children",
      parentInstanceId: "block",
    })
  ).toEqual({ type: "project" });
});

test("rejects persisted children that compete with external storage", () => {
  const state = createState();
  state.instances?.set("persisted", {
    type: "instance",
    id: "persisted",
    component: elementComponent,
    children: [],
  });
  state.instances?.get("block")?.children.push({
    type: "id",
    value: "persisted",
  });

  expect(() =>
    createContentStorageProjection({
      state,
      materializedRoots: [
        { identity: identity("page:/post"), fragment: fragment("external") },
      ],
    })
  ).toThrow("persisted content");
});

test("rejects two render scopes projected onto the same block", () => {
  const state = createState();

  expect(() =>
    createContentStorageProjection({
      state,
      materializedRoots: [
        { identity: identity("page:/one"), fragment: fragment("one") },
        { identity: identity("page:/two"), fragment: fragment("two") },
      ],
    })
  ).toThrow("one render scope");
});

test("projects materialized roots into runtime reads", () => {
  const state = createState();
  const materializedContent = [
    {
      identity: identity("page:/post"),
      fragment: fragment("external-root"),
    },
  ];

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.list",
      state,
      input: { rootInstanceId: "block" },
      context: { createId: () => "unused", materializedContent },
    })
  ).toMatchObject({
    instances: [
      { id: "block", depth: 0 },
      { id: "templates", depth: 1 },
      { id: "external-root", depth: 1 },
    ],
  });
  expect(state.instances?.has("external-root")).toBe(false);
});

test("projects reads whose contract does not load source props", () => {
  const state = createState();
  state.props = undefined;
  state.pages = createDefaultPages({ rootInstanceId: "block" });

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.listTexts",
      state,
      input: { instanceId: "external-root" },
      context: {
        createId: () => "unused",
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: fragment("external-root"),
          },
        ],
      },
    })
  ).toMatchObject({
    texts: [
      {
        instanceId: "external-root",
        valuePreview: "External content",
      },
    ],
  });
});

test("projects nested storage roots regardless of input order", () => {
  const state = createState();
  const { parentIdentity, nestedIdentity, roots } =
    createNestedMaterializedContent();
  const projection = createContentStorageProjection({
    state,
    materializedRoots: roots,
  });

  expect(projection.state.instances?.get("nested-block")?.children).toEqual([
    { type: "id", value: "nested-templates" },
    { type: "id", value: "nested-content" },
  ]);
  expect(
    resolveContentStorageRoot(projection, {
      type: "instance",
      instanceId: "nested-block",
    })
  ).toEqual({ type: "external", identity: parentIdentity });
  expect(
    resolveContentStorageRoot(projection, {
      type: "children",
      parentInstanceId: "nested-block",
    })
  ).toEqual({ type: "external", identity: nestedIdentity });
  expect(
    resolveContentStorageRoot(projection, {
      type: "instance",
      instanceId: "nested-content",
    })
  ).toEqual({ type: "external", identity: nestedIdentity });
});

test("rejects a stale materialization for a changed direct binding", () => {
  const state = createState(assetSource("new-article"));

  expect(() =>
    createContentStorageProjection({
      state,
      materializedRoots: [
        { identity: identity("page:/post"), fragment: fragment("external") },
      ],
    })
  ).toThrow("changed source");
});

test("rejects conflicting reusable records instead of silently shadowing them", () => {
  const state = createState();
  state.styleSources = new Map([
    ["shared-token", { type: "token", id: "shared-token", name: "Current" }],
  ]);
  const externalFragment = fragment("external");
  externalFragment.styleSources = [
    { type: "token", id: "shared-token", name: "Stale" },
  ];

  expect(() =>
    createContentStorageProjection({
      state,
      materializedRoots: [
        { identity: identity("page:/post"), fragment: externalFragment },
      ],
    })
  ).toThrow("conflicts with project data");
});

test("rejects materialized instance references outside their storage root", () => {
  const state = createState();
  const externalFragment = fragment("external");
  externalFragment.instances[0].children = [{ type: "id", value: "templates" }];

  expect(() =>
    createContentStorageProjection({
      state,
      materializedRoots: [
        { identity: identity("page:/post"), fragment: externalFragment },
      ],
    })
  ).toThrow("outside its storage root");
});

test("requires the protected Templates list on a source-backed block", () => {
  const state = createState();
  state.instances?.get("block")?.children.splice(0);

  expect(() =>
    createContentStorageProjection({
      state,
      materializedRoots: [
        { identity: identity("page:/post"), fragment: fragment("external") },
      ],
    })
  ).toThrow("one Templates list");
});

test("requires materialized local style sources to be scope-local", () => {
  const state = createState();
  state.styleSources = new Map([["local", { type: "local", id: "local" }]]);
  const externalFragment = fragment("external");
  externalFragment.styleSources = [{ type: "local", id: "local" }];

  expect(() =>
    createContentStorageProjection({
      state,
      materializedRoots: [
        { identity: identity("page:/post"), fragment: externalFragment },
      ],
    })
  ).toThrow("not scope-local");
});

test("routes external text updates without patching persisted instances", () => {
  const state = createState();
  const externalIdentity = identity("page:/post");
  const externalFragment = fragment("external");

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state,
      input: {
        instanceId: "external",
        childIndex: 0,
        text: "Updated content",
      },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "instances",
            patches: [
              {
                op: "replace",
                path: ["external", "children", 0],
                value: { type: "text", value: "Updated content" },
              },
            ],
          },
        ],
      },
    ],
  });
  expect(state.instances?.has("external")).toBe(false);
  expect(externalFragment.instances[0].children).toEqual([
    { type: "text", value: "External content" },
  ]);
});

test("keeps ordinary text updates on the project patch path", () => {
  const state = createState();
  state.instances?.set("ordinary", {
    type: "instance",
    id: "ordinary",
    component: elementComponent,
    children: [{ type: "text", value: "Before" }],
  });

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state,
      input: { instanceId: "ordinary", childIndex: 0, text: "After" },
      context: { createId: () => "unused" },
    })
  ).toMatchObject({
    payload: [
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["ordinary", "children", 0],
            value: { type: "text", value: "After" },
          },
        ],
      },
    ],
  });
});

test("validates external text updates with Content-mode permissions", () => {
  const state = createState();
  const protectedFragment = fragment("external-template");
  protectedFragment.instances[0].component = blockTemplateComponent;

  try {
    executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state,
      input: {
        instanceId: "external-template",
        childIndex: 0,
        text: "Blocked",
      },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: protectedFragment,
          },
        ],
      },
    });
    throw new Error("Expected Content-mode validation to reject the update");
  } catch (error) {
    expect(error).toMatchObject({ code: "BAD_REQUEST" });
  }
  expect(protectedFragment.instances[0].children).toEqual([
    { type: "text", value: "External content" },
  ]);
});

test("routes direct Content Block text children to external storage", () => {
  const state = createState();
  const externalIdentity = identity("page:/post");
  const externalFragment = fragment("unused");
  externalFragment.children = [
    { type: "text", value: "Direct external content" },
  ];
  externalFragment.instances = [];

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state,
      input: { instanceId: "block", childIndex: 1, text: "Updated direct" },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "fragment",
            patches: [
              {
                path: ["children", 0],
                value: { type: "text", value: "Updated direct" },
              },
            ],
          },
        ],
      },
    ],
  });
});

test("routes text updates to the innermost nested storage scope", () => {
  const state = createState();
  const { nestedIdentity, roots } = createNestedMaterializedContent();

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state,
      input: {
        instanceId: "nested-content",
        childIndex: 0,
        text: "Nested update",
      },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: nestedIdentity },
        payload: [
          {
            namespace: "instances",
            patches: [
              {
                path: ["nested-content", "children", 0],
                value: { type: "text", value: "Nested update" },
              },
            ],
          },
        ],
      },
    ],
  });
});

test("routes external whole-text mutations through the same storage contract", () => {
  const state = createState();
  const externalIdentity = identity("page:/post");

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.setTextContent",
      state,
      input: {
        operation: "set",
        instanceId: "external",
        text: "Replacement",
        mode: "text",
      },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: fragment("external") },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "instances",
            patches: [
              {
                path: ["external", "children"],
                value: [{ type: "text", value: "Replacement" }],
              },
            ],
          },
        ],
      },
    ],
  });
});

test("preserves Templates when replacing direct Content Block text", () => {
  const state = createState();
  const externalIdentity = identity("page:/post");
  const externalFragment = fragment("unused");
  externalFragment.children = [{ type: "text", value: "Before" }];
  externalFragment.instances = [];

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.setTextContent",
      state,
      input: {
        operation: "set",
        instanceId: "block",
        text: "After",
        mode: "text",
      },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "fragment",
            patches: [
              {
                path: ["children"],
                value: [{ type: "text", value: "After" }],
              },
            ],
          },
        ],
      },
    ],
  });
  expect(state.instances?.get("block")?.children).toEqual([
    { type: "id", value: "templates" },
  ]);
});

test("requires callers to opt into handling authored storage changes", () => {
  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state: createState(),
      input: { instanceId: "external", childIndex: 0, text: "Update" },
      context: {
        createId: () => "unused",
        materializedContent: [
          { identity: identity("page:/post"), fragment: fragment("external") },
        ],
      },
    })
  ).toThrow("storage changes");
});

test("returns an external noop after a repeated text update", () => {
  const externalFragment = fragment("external");
  externalFragment.instances[0].children = [
    { type: "text", value: "Already updated" },
  ];

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.updateText",
      state: createState(),
      input: {
        instanceId: "external",
        childIndex: 0,
        text: "Already updated",
      },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: externalFragment,
          },
        ],
      },
    })
  ).toMatchObject({ payload: [], noop: true });
});

test("routes inline-expression conversion without mutating materialized input", () => {
  const externalFragment = fragment("external");
  externalFragment.instances[0].children = [
    { type: "expression", value: "$ws$data$title" },
  ];

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.setTextContent",
      state: createState(),
      input: {
        operation: "inlineExpressions",
        instanceId: "external",
        replacements: [
          {
            childIndex: 0,
            expression: "$ws$data$title",
            text: "Resolved title",
          },
        ],
      },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: externalFragment,
          },
        ],
      },
    })
  ).toMatchObject({
    storageChanges: [
      {
        payload: [
          {
            namespace: "instances",
            patches: [
              {
                path: ["external", "children"],
                value: [{ type: "text", value: "Resolved title" }],
              },
            ],
          },
        ],
      },
    ],
  });
  expect(externalFragment.instances[0].children).toEqual([
    { type: "expression", value: "$ws$data$title" },
  ]);
});

test("partitions bulk text replacement between project and external storage", () => {
  const state = createState();
  state.instances?.set("body", {
    type: "instance",
    id: "body",
    component: elementComponent,
    children: [
      { type: "id", value: "block" },
      { type: "id", value: "ordinary" },
    ],
  });
  state.instances?.set("ordinary", {
    type: "instance",
    id: "ordinary",
    component: elementComponent,
    children: [{ type: "text", value: "Replace me" }],
  });
  state.pages = createDefaultPages({ rootInstanceId: "body" });
  const externalIdentity = identity("page:/post");
  const externalFragment = fragment("external");
  externalFragment.instances[0].children = [
    { type: "text", value: "Replace me" },
  ];

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.replaceText",
      state,
      input: { find: "Replace me", replace: "Replaced", match: "exact" },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [
      {
        namespace: "instances",
        patches: [{ path: ["ordinary", "children", 0] }],
      },
    ],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "instances",
            patches: [{ path: ["external", "children", 0] }],
          },
        ],
      },
    ],
    result: { changedCount: 2, matchingChildCount: 2 },
  });
});

test("routes rich-text tree updates and preserves authored siblings", () => {
  const state = createState();
  const externalIdentity = identity("page:/post");
  const externalFragment = fragment("rich-text");
  externalFragment.children.push({ type: "id", value: "unresolved-marker" });
  externalFragment.instances.push({
    type: "instance",
    id: "unresolved-marker",
    component: elementComponent,
    children: [{ type: "text", value: "Preserve me" }],
  });

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.updateTextTree",
      state,
      input: {
        rootInstanceId: "rich-text",
        instances: [
          {
            type: "instance",
            id: "rich-text",
            component: elementComponent,
            tag: "p",
            children: [{ type: "text", value: "Updated rich text" }],
          },
        ],
      },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "instances",
            patches: [
              {
                path: ["rich-text"],
                value: expect.objectContaining({
                  children: [{ type: "text", value: "Updated rich text" }],
                }),
              },
            ],
          },
        ],
      },
    ],
  });
  expect(externalFragment.instances.at(-1)?.id).toBe("unresolved-marker");
  expect(externalFragment.children.at(-1)).toEqual({
    type: "id",
    value: "unresolved-marker",
  });
});

test("rejects rich-text updates that cross a nested storage boundary", () => {
  const { roots } = createNestedMaterializedContent();

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.updateTextTree",
      state: createState(),
      input: {
        rootInstanceId: "outer-rich-text",
        instances: [
          {
            type: "instance",
            id: "outer-rich-text",
            component: elementComponent,
            children: [{ type: "text", value: "Remove nested content" }],
          },
        ],
      },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toThrow("storage boundary");
});

const linkFragment = (id: string, href: string): WebstudioFragment => ({
  ...fragment(id),
  instances: [
    {
      type: "instance",
      id,
      component: "Link",
      children: [{ type: "text", value: id }],
    },
  ],
  props: [
    {
      id: `${id}-href`,
      instanceId: id,
      name: "href",
      type: "string",
      value: href,
    },
  ],
});

test("partitions mixed project and external prop updates", () => {
  const state = createState();
  state.instances?.set("ordinary-link", {
    type: "instance",
    id: "ordinary-link",
    component: "Link",
    children: [],
  });
  state.props?.set("ordinary-href", {
    id: "ordinary-href",
    instanceId: "ordinary-link",
    name: "href",
    type: "string",
    value: "/before",
  });
  const externalIdentity = identity("page:/post");

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.updateProps",
      state,
      input: {
        updates: [
          {
            instanceId: "ordinary-link",
            name: "href",
            type: "string",
            value: "/ordinary",
          },
          {
            instanceId: "external-link",
            name: "href",
            type: "string",
            value: "/external",
          },
        ],
      },
      context: {
        createId: () => "unused",
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: externalIdentity,
            fragment: linkFragment("external-link", "/before"),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [
      {
        namespace: "props",
        patches: [{ path: ["ordinary-href"] }],
      },
    ],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "props",
            patches: [{ path: ["external-link-href"] }],
          },
        ],
      },
    ],
    result: { propIds: ["ordinary-href", "external-link-href"] },
  });
});

test("routes bulk prop replacement and deletion to external storage", () => {
  const state = createState();
  state.instances?.set("ordinary-link", {
    type: "instance",
    id: "ordinary-link",
    component: "Link",
    children: [],
  });
  state.props?.set("ordinary-href", {
    id: "ordinary-href",
    instanceId: "ordinary-link",
    name: "href",
    type: "string",
    value: "/before",
  });
  const externalIdentity = identity("page:/post");
  const externalFragment = linkFragment("external-link", "/before");
  const context = {
    createId: () => "unused",
    returnStorageChanges: true,
    materializedContent: [
      { identity: externalIdentity, fragment: externalFragment },
    ],
  };

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.replacePropText",
      state,
      input: { find: "/before", replace: "/after", match: "exact" },
      context,
    })
  ).toMatchObject({
    payload: [
      {
        namespace: "props",
        patches: [{ path: ["ordinary-href", "value"], value: "/after" }],
      },
    ],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "props",
            patches: [
              { path: ["external-link-href", "value"], value: "/after" },
            ],
          },
        ],
      },
    ],
    result: { changedCount: 2, matchingPropCount: 2 },
  });

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.deleteProps",
      state,
      input: {
        deletions: [{ instanceId: "external-link", name: "href" }],
      },
      context,
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "props",
            patches: [{ op: "remove", path: ["external-link-href"] }],
          },
        ],
      },
    ],
  });
});

test("routes asset props while retaining the authored Asset reference", () => {
  const state = createState();
  const externalIdentity = identity("page:/post");
  const externalFragment = fragment("external-image");
  externalFragment.instances[0].component = "Image";

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.updateProps",
      state,
      input: {
        updates: [
          {
            instanceId: "external-image",
            name: "src",
            type: "asset",
            value: "hero-asset",
          },
        ],
      },
      context: {
        createId: () => "external-src",
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "props",
            patches: [
              {
                path: ["external-src"],
                value: { type: "asset", value: "hero-asset" },
              },
            ],
          },
        ],
      },
    ],
  });
});

test("rejects design-only props and cross-root prop references", () => {
  const state = createState();
  state.instances?.set("ordinary-link", {
    type: "instance",
    id: "ordinary-link",
    component: "Link",
    children: [],
  });
  const firstIdentity = identity("page:/first");
  const secondIdentity = identity("page:/second", "second-block", "second");
  state.instances?.set("second-block", {
    type: "instance",
    id: "second-block",
    component: blockComponent,
    children: [{ type: "id", value: "second-templates" }],
  });
  state.instances?.set("second-templates", {
    type: "instance",
    id: "second-templates",
    component: blockTemplateComponent,
    children: [],
  });
  state.props?.set("second-src", {
    id: "second-src",
    instanceId: "second-block",
    name: "src",
    type: "asset",
    value: "second",
  });
  const secondFragment = linkFragment("second-link", "/second");
  secondFragment.dataSources.push({
    id: "second-parameter",
    scopeInstanceId: "second-link",
    type: "parameter",
    name: "secondParameter",
  });
  const materializedContent = [
    {
      identity: firstIdentity,
      fragment: linkFragment("first-link", "/first"),
    },
    { identity: secondIdentity, fragment: secondFragment },
  ];

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.updateProps",
      state,
      input: {
        updates: [
          {
            instanceId: "first-link",
            name: "target",
            type: "string",
            value: "_blank",
          },
        ],
      },
      context: {
        createId: () => "first-target",
        returnStorageChanges: true,
        materializedContent,
      },
    })
  ).toThrow("not editable in content mode");

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.bindProps",
      state,
      input: {
        bindings: [
          {
            instanceId: "first-link",
            name: "href",
            binding: { type: "parameter", value: "second-parameter" },
          },
        ],
      },
      context: {
        createId: () => "first-binding",
        returnStorageChanges: true,
        materializedContent,
      },
    })
  ).toThrow("crosses an authored storage boundary");

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.bindProps",
      state,
      input: {
        bindings: [
          {
            instanceId: "ordinary-link",
            name: "href",
            binding: { type: "parameter", value: "second-parameter" },
          },
        ],
      },
      context: {
        createId: () => "ordinary-binding",
        returnStorageChanges: true,
        materializedContent,
      },
    })
  ).toThrow("crosses an authored storage boundary");
});

test.each([
  {
    label: "incompatible",
    update: {
      instanceId: "external-link",
      name: "href",
      type: "boolean" as const,
      value: true,
    },
  },
  {
    label: "unknown",
    update: {
      instanceId: "external-link",
      name: "unknown",
      type: "string" as const,
      value: "value",
    },
  },
])("rejects $label external props", ({ update }) => {
  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.updateProps",
      state: createState(),
      input: { updates: [update] },
      context: {
        createId: () => `${update.name}-prop`,
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: linkFragment("external-link", "/before"),
          },
        ],
      },
    })
  ).toThrow("not editable in content mode");
});

test("routes prop updates to the innermost nested storage root", () => {
  const { nestedIdentity, roots } = createNestedMaterializedContent();
  roots[0].fragment.instances[0].component = "Image";

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.updateProps",
      state: createState(),
      input: {
        updates: [
          {
            instanceId: "nested-content",
            name: "src",
            type: "asset",
            value: "nested-image",
          },
        ],
      },
      context: {
        createId: () => "nested-content-src",
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: nestedIdentity },
        payload: [
          {
            namespace: "props",
            patches: [
              {
                path: ["nested-content-src"],
                value: { value: "nested-image" },
              },
            ],
          },
        ],
      },
    ],
  });
});

test("inserts a component into direct authored Content Block children", () => {
  const state = createStructuralState();
  const externalIdentity = identity("page:/post");

  const mutation = executeBuilderRuntimeOperation({
    id: "instances.insertComponent",
    state,
    input: {
      parentInstanceId: "block",
      component: elementComponent,
      tag: "section",
    },
    context: {
      createId: createIdFactory(),
      returnStorageChanges: true,
      materializedContent: [
        { identity: externalIdentity, fragment: fragment("external") },
      ],
    },
  });

  expect(mutation).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: expect.arrayContaining([
          {
            namespace: "fragment",
            patches: [expect.objectContaining({ path: ["children", 1] })],
          },
        ]),
      },
    ],
    result: { parentInstanceId: "block" },
  });
  expect(state.instances?.get("block")?.children).toEqual([
    { type: "id", value: "templates" },
  ]);

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.insertComponent",
      state,
      input: {
        parentInstanceId: "block",
        component: elementComponent,
        tag: "section",
      },
      context: {
        createId: createIdFactory(),
        materializedContent: [
          { identity: externalIdentity, fragment: fragment("external") },
        ],
      },
    })
  ).toThrow("must handle authored storage changes");
});

test.each([
  { label: "explicit first index", input: { insertIndex: 0 } },
  { label: "prepend", input: { mode: "prepend" as const } },
  { label: "replace", input: { mode: "replace" as const } },
])("inserts at direct authored coordinates with $label", ({ input }) => {
  const externalIdentity = identity("page:/post");
  const mutation = executeBuilderRuntimeOperation({
    id: "instances.insertComponent",
    state: createStructuralState(),
    input: {
      parentInstanceId: "block",
      component: elementComponent,
      tag: "section",
      ...input,
    },
    context: {
      createId: createIdFactory(),
      returnStorageChanges: true,
      materializedContent: [
        { identity: externalIdentity, fragment: fragment("external") },
      ],
    },
  });
  expect(mutation).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: expect.arrayContaining([
          {
            namespace: "fragment",
            patches: expect.arrayContaining([
              expect.objectContaining({ path: ["children", 0] }),
            ]),
          },
        ]),
      },
    ],
    result: {
      removedInstanceIds: input.mode === "replace" ? ["external"] : [],
    },
  });
});

test("inserts a fragment into an external descendant", () => {
  const state = createStructuralState();
  const externalIdentity = identity("page:/post");
  const externalFragment = fragment("external");
  externalFragment.instances[0].tag = "div";
  const insertedFragment = fragment("incoming");
  insertedFragment.instances[0].tag = "article";

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.insertFragment",
      state,
      input: {
        parentInstanceId: "external",
        fragment: insertedFragment,
        contentMode: true,
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [expect.objectContaining({ namespace: "instances" })],
      },
    ],
    result: { parentInstanceId: "external" },
  });
});

test("inserts into the innermost nested storage scope", () => {
  const { nestedIdentity, roots } = createNestedMaterializedContent();

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.insertComponent",
      state: createStructuralState(),
      input: {
        parentInstanceId: "nested-content",
        component: elementComponent,
        tag: "span",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [{ root: { type: "external", identity: nestedIdentity } }],
  });
});

test("keeps token-only fragments project-owned when a parent is provided", () => {
  const tokenFragment = fragment("unused");
  tokenFragment.children = [];
  tokenFragment.instances = [];
  tokenFragment.styleSources = [{ type: "token", id: "brand", name: "Brand" }];
  tokenFragment.styles = [
    {
      styleSourceId: "brand",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ];
  tokenFragment.breakpoints = [{ id: "base", label: "" }];

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.insertFragment",
      state: createStructuralState(),
      input: {
        parentInstanceId: "external",
        fragment: tokenFragment,
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: fragment("external") },
        ],
      },
    })
  ).toMatchObject({
    storageChanges: undefined,
    payload: expect.arrayContaining([
      expect.objectContaining({ namespace: "styleSources" }),
    ]),
    result: { rootInstanceIds: [] },
  });
});

test("routes collection insertion through Content-mode validation", () => {
  const externalIdentity = identity("page:/post");
  const externalFragment = fragment("external");
  externalFragment.instances[0].tag = "div";

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.insertCollection",
      state: createStructuralState(),
      input: {
        parentInstanceId: "external",
        data: { type: "json", value: [] },
        itemFragment: fragment("item"),
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toThrow("not editable in content mode");
});

test("deletes an authored instance without changing persisted children", () => {
  const state = createStructuralState();
  const externalIdentity = identity("page:/post");

  const mutation = executeBuilderRuntimeOperation({
    id: "instances.deleteBySelector",
    state,
    input: { instanceSelector: ["external", "block"] },
    context: {
      createId: createIdFactory(),
      returnStorageChanges: true,
      materializedContent: [
        { identity: externalIdentity, fragment: fragment("external") },
      ],
    },
  });

  expect(mutation).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: expect.arrayContaining([
          expect.objectContaining({ namespace: "fragment" }),
          expect.objectContaining({ namespace: "instances" }),
        ]),
      },
    ],
    result: { instanceIds: ["external"] },
  });
  expect(state.instances?.get("block")?.children).toEqual([
    { type: "id", value: "templates" },
  ]);

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.deleteBySelector",
      state,
      input: { instanceSelector: ["external", "block"] },
      context: {
        createId: createIdFactory(),
        materializedContent: [
          { identity: externalIdentity, fragment: fragment("external") },
        ],
      },
    })
  ).toThrow("must handle authored storage changes");
});

test("deletes from the innermost nested storage scope", () => {
  const { nestedIdentity, roots } = createNestedMaterializedContent();

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.deleteBySelector",
      state: createStructuralState(),
      input: { instanceSelector: ["nested-content", "nested-block"] },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [{ root: { type: "external", identity: nestedIdentity } }],
    result: { instanceIds: ["nested-content"] },
  });
});

test.each([
  {
    operation: "delete",
    id: "instances.deleteBySelector" as const,
    input: { instanceSelector: ["templates", "block"] },
  },
  {
    operation: "convert",
    id: "instances.convert" as const,
    input: {
      instanceSelector: ["templates", "block"],
      component: elementComponent,
      tag: "div",
    },
  },
])("protects the Templates list from $operation", ({ id, input }) => {
  expect(() =>
    executeBuilderRuntimeOperation({
      id,
      state: createStructuralState(),
      input,
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: fragment("external") },
        ],
      },
    })
  ).toThrow("Templates list cannot be changed");
});

test("protects a nested source-backed Templates list", () => {
  const { roots } = createNestedMaterializedContent();

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.deleteBySelector",
      state: createStructuralState(),
      input: {
        instanceSelector: [
          "nested-templates",
          "nested-block",
          "outer-rich-text",
          "block",
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toThrow("Templates list cannot be changed");
});

test("rejects converting authored component and tag metadata", () => {
  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.convert",
      state: createStructuralState(),
      input: {
        instanceSelector: ["external", "block"],
        component: elementComponent,
        tag: "section",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: fragment("external") },
        ],
      },
    })
  ).toThrow("Instance patch is not editable in content mode");
});

test("fills an authored grid in cell order", () => {
  const state = createStructuralState();
  const externalIdentity = identity("page:/post");
  const externalFragment = fragment("grid");
  externalFragment.instances[0].tag = "div";

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.fillGrid",
      state,
      input: {
        parentInstanceId: "grid",
        totalCells: 2,
        breakpointId: "base",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "instances",
            patches: expect.arrayContaining([
              expect.objectContaining({
                path: ["grid", "children", 1],
                value: { type: "id", value: "generated-0" },
              }),
              expect.objectContaining({
                path: ["grid", "children", 2],
                value: { type: "id", value: "generated-2" },
              }),
            ]),
          },
          expect.objectContaining({ namespace: "styleSources" }),
          expect.objectContaining({ namespace: "styleSourceSelections" }),
          expect.objectContaining({ namespace: "styles" }),
        ],
      },
    ],
    result: {
      instanceIds: ["generated-0", "generated-2"],
      styleSourceIds: ["generated-1", "generated-3"],
    },
  });
  expect(state.instances?.get("block")?.children).toEqual([
    { type: "id", value: "templates" },
  ]);
});

test("fills a grid in the innermost nested storage scope", () => {
  const { nestedIdentity, roots } = createNestedMaterializedContent();
  roots[0].fragment.instances[0].tag = "div";

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.fillGrid",
      state: createStructuralState(),
      input: {
        parentInstanceId: "nested-content",
        totalCells: 1,
        breakpointId: "base",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [{ root: { type: "external", identity: nestedIdentity } }],
    result: {
      instanceIds: ["generated-0"],
      styleSourceIds: ["generated-1"],
    },
  });
});

test("keeps a complete authored grid as a storage noop", () => {
  const externalFragment = fragment("grid");
  externalFragment.instances[0].tag = "div";
  externalFragment.instances[0].children = [
    { type: "id", value: "existing-cell" },
  ];
  externalFragment.instances.push({
    type: "instance",
    id: "existing-cell",
    component: elementComponent,
    tag: "div",
    children: [],
  });

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.fillGrid",
      state: createStructuralState(),
      input: {
        parentInstanceId: "grid",
        totalCells: 1,
        breakpointId: "base",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: undefined,
    noop: true,
    result: { instanceIds: [], styleSourceIds: [] },
  });

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.fillGrid",
      state: createStructuralState(),
      input: {
        parentInstanceId: "grid",
        totalCells: 1,
        breakpointId: "base",
      },
      context: {
        createId: createIdFactory(),
        materializedContent: [
          { identity: identity("page:/post"), fragment: externalFragment },
        ],
      },
    })
  ).toThrow("must handle authored storage changes");
});

test("rejects generated grid cell id collisions", () => {
  const externalFragment = fragment("grid");
  externalFragment.instances[0].tag = "div";

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.fillGrid",
      state: createStructuralState(),
      input: {
        parentInstanceId: "grid",
        totalCells: 1,
        breakpointId: "base",
      },
      context: {
        createId: () => "grid",
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: externalFragment },
        ],
      },
    })
  ).toThrow("Instance patch is not editable in content mode");
});

test.each([
  {
    operation: "tag",
    id: "instances.setTag" as const,
    input: { instanceId: "external", tag: "section" },
  },
  {
    operation: "label",
    id: "instances.setLabel" as const,
    input: { instanceId: "external", label: "Article body" },
  },
])("rejects authored instance $operation metadata", ({ id, input }) => {
  const state = createStructuralState();
  const externalIdentity = identity("page:/post");
  const materializedContent = [
    { identity: externalIdentity, fragment: fragment("external") },
  ];

  expect(() =>
    executeBuilderRuntimeOperation({
      id,
      state,
      input,
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent,
      },
    })
  ).toThrow("Instance patch is not editable in content mode");
  expect(state.instances?.has("external")).toEqual(false);

  expect(() =>
    executeBuilderRuntimeOperation({
      id,
      state,
      input,
      context: {
        createId: createIdFactory(),
        materializedContent,
      },
    })
  ).toThrow("must handle authored storage changes");
});

test("rejects nested authored metadata in its own storage scope", () => {
  const { roots } = createNestedMaterializedContent();

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.setLabel",
      state: createStructuralState(),
      input: { instanceId: "nested-content", label: "Nested article" },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toThrow("Instance patch is not editable in content mode");
});

test.each([
  {
    operation: "tag",
    id: "instances.setTag" as const,
    input: { instanceId: "external", tag: "p" },
    result: { instanceId: "external", tag: "p" },
  },
  {
    operation: "label",
    id: "instances.setLabel" as const,
    input: { instanceId: "external", label: "Article body" },
    result: { instanceIds: ["external"], label: "Article body" },
  },
])("keeps repeated authored $operation metadata as a noop", (testCase) => {
  const externalFragment = fragment("external");
  externalFragment.instances[0].label = "Article body";
  const materializedContent = [
    { identity: identity("page:/post"), fragment: externalFragment },
  ];

  expect(
    executeBuilderRuntimeOperation({
      id: testCase.id,
      state: createStructuralState(),
      input: testCase.input,
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent,
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: undefined,
    noop: true,
    result: testCase.result,
  });

  expect(() =>
    executeBuilderRuntimeOperation({
      id: testCase.id,
      state: createStructuralState(),
      input: testCase.input,
      context: {
        createId: createIdFactory(),
        materializedContent,
      },
    })
  ).toThrow("must handle authored storage changes");
});

test("keeps Content Block and Templates metadata project-owned", () => {
  const state = createStructuralState();
  state.instances?.get("templates")?.children.push({
    type: "id",
    value: "template",
  });
  state.instances?.set("template", {
    type: "instance",
    id: "template",
    component: elementComponent,
    tag: "section",
    children: [],
  });
  const materializedContent = [
    {
      identity: identity("page:/post"),
      fragment: fragment("external"),
    },
  ];

  for (const instanceId of ["block", "templates", "template"]) {
    expect(
      executeBuilderRuntimeOperation({
        id: "instances.setLabel",
        state,
        input: { instanceId, label: `Renamed ${instanceId}` },
        context: {
          createId: createIdFactory(),
          returnStorageChanges: true,
          materializedContent,
        },
      })
    ).toMatchObject({
      payload: [
        {
          namespace: "instances",
          patches: [
            {
              path: [instanceId, "label"],
              value: `Renamed ${instanceId}`,
            },
          ],
        },
      ],
      storageChanges: undefined,
      result: {
        instanceIds: [instanceId],
        label: `Renamed ${instanceId}`,
      },
    });
  }
});

const siblingFragment = (
  parentId: string,
  childIds: readonly string[]
): WebstudioFragment => ({
  ...fragment(parentId),
  instances: [
    {
      type: "instance",
      id: parentId,
      component: elementComponent,
      tag: "div",
      children: childIds.map((value) => ({ type: "id" as const, value })),
    },
    ...childIds.map((id) => ({
      type: "instance" as const,
      id,
      component: elementComponent,
      tag: "p",
      children: [{ type: "text" as const, value: id }],
    })),
  ],
});

const addSecondSourceBlock = (state: BuilderState) => {
  state.instances?.set("second-block", {
    type: "instance",
    id: "second-block",
    component: blockComponent,
    children: [{ type: "id", value: "second-templates" }],
  });
  state.instances?.set("second-templates", {
    type: "instance",
    id: "second-templates",
    component: blockTemplateComponent,
    children: [],
  });
  state.props?.set("second-src", {
    id: "second-src",
    instanceId: "second-block",
    name: "src",
    type: "asset",
    value: "second",
  });
  return state;
};

test("reorders authored siblings within one storage root", () => {
  const externalIdentity = identity("page:/post");
  const externalFragment = siblingFragment("parent", ["first", "second"]);

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.reparent",
      state: createStructuralState(),
      input: {
        sourceInstanceSelector: ["first", "parent", "block"],
        dropTarget: {
          parentSelector: ["parent", "block"],
          position: "end",
        },
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      { root: { type: "external", identity: externalIdentity } },
    ],
    result: { instanceSelector: ["first", "parent", "block"] },
  });

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.reparent",
      state: createStructuralState(),
      input: {
        sourceInstanceSelector: ["first", "parent", "block"],
        dropTarget: {
          parentSelector: ["parent", "block"],
          position: "end",
        },
      },
      context: {
        createId: createIdFactory(),
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toThrow("must handle authored storage changes");
});

test("keeps a repeated authored reorder as a noop", () => {
  expect(
    executeBuilderRuntimeOperation({
      id: "instances.reparent",
      state: createStructuralState(),
      input: {
        sourceInstanceSelector: ["first", "parent", "block"],
        dropTarget: {
          parentSelector: ["parent", "block"],
          position: "end",
        },
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: siblingFragment("parent", ["second", "first"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: undefined,
    noop: true,
    result: { instanceSelector: ["first", "parent", "block"] },
  });
});

test("routes batched moves within their authored roots", () => {
  const externalIdentity = identity("page:/post");

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state: createStructuralState(),
      input: {
        moves: [
          { instanceId: "first", parentInstanceId: "parent", position: "end" },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: externalIdentity,
            fragment: siblingFragment("parent", ["first", "second"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      { root: { type: "external", identity: externalIdentity } },
    ],
    result: { instanceIds: ["first"] },
  });
});

test("orders independent batched moves by their authored roots", () => {
  const firstIdentity = identity("page:/post");
  const secondIdentity = identity("page:/second", "second-block", "second");

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state: addSecondSourceBlock(createStructuralState()),
      input: {
        moves: [
          {
            instanceId: "first",
            parentInstanceId: "first-parent",
            position: "end",
          },
          {
            instanceId: "second",
            parentInstanceId: "second-parent",
            position: "end",
          },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: firstIdentity,
            fragment: siblingFragment("first-parent", ["first", "first-tail"]),
          },
          {
            identity: secondIdentity,
            fragment: siblingFragment("second-parent", [
              "second",
              "second-tail",
            ]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      { root: { type: "external", identity: firstIdentity } },
      { root: { type: "external", identity: secondIdentity } },
    ],
    result: { instanceIds: ["first", "second"] },
  });
});

test("moves authored content into project ownership atomically", () => {
  const state = createStructuralState();
  state.instances?.set("project-parent", {
    type: "instance",
    id: "project-parent",
    component: elementComponent,
    tag: "div",
    children: [],
  });
  const externalFragment = siblingFragment("parent", ["first"]);
  externalFragment.props = [
    {
      id: "first-asset",
      instanceId: "first",
      name: "src",
      type: "asset",
      value: "article",
    },
  ];
  externalFragment.dataSources = [
    {
      id: "first-data",
      scopeInstanceId: "first",
      name: "Posts",
      type: "resource",
      resourceId: "first-resource",
    },
  ];
  externalFragment.resources = [
    {
      id: "first-resource",
      name: "Posts",
      method: "get",
      url: '"/posts"',
      headers: [],
    },
  ];
  externalFragment.styleSources = [{ type: "local", id: "first-style" }];
  externalFragment.styleSourceSelections = [
    { instanceId: "first", values: ["first-style"] },
  ];
  externalFragment.styles = [
    {
      styleSourceId: "first-style",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ];

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state,
      input: {
        moves: [
          {
            instanceId: "first",
            parentInstanceId: "project-parent",
            position: "end",
          },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: externalFragment,
          },
        ],
      },
    })
  ).toMatchObject({
    payload: expect.arrayContaining([
      expect.objectContaining({ namespace: "instances" }),
      expect.objectContaining({ namespace: "props" }),
      expect.objectContaining({ namespace: "dataSources" }),
      expect.objectContaining({ namespace: "resources" }),
      expect.objectContaining({ namespace: "styleSourceSelections" }),
      expect.objectContaining({ namespace: "styleSources" }),
      expect.objectContaining({ namespace: "styles" }),
    ]),
    storageChanges: [
      { root: { type: "external", identity: identity("page:/post") } },
    ],
    result: { instanceIds: ["first"] },
  });
});

test("moves content between authored storage roots atomically", () => {
  const sourceIdentity = identity("page:/post");
  const targetIdentity = identity("page:/second", "second-block", "second");

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state: addSecondSourceBlock(createStructuralState()),
      input: {
        moves: [
          {
            instanceId: "first",
            parentInstanceId: "second-parent",
            position: "end",
          },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: sourceIdentity,
            fragment: siblingFragment("parent", ["first"]),
          },
          {
            identity: targetIdentity,
            fragment: siblingFragment("second-parent", ["second"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      { root: { type: "external", identity: sourceIdentity } },
      { root: { type: "external", identity: targetIdentity } },
    ],
    result: { instanceIds: ["first"] },
  });
});

test("rejects overlapping cross-root subtree transfers atomically", () => {
  const sourceFragment = siblingFragment("parent", ["wrapper"]);
  const wrapper = sourceFragment.instances.find(
    (instance) => instance.id === "wrapper"
  );
  if (wrapper !== undefined) {
    wrapper.children = [{ type: "id", value: "child" }];
  }
  sourceFragment.instances.push({
    type: "instance",
    id: "child",
    component: elementComponent,
    tag: "span",
    children: [],
  });
  const targetFragment = siblingFragment("second-parent", ["second"]);
  const state = addSecondSourceBlock(createStructuralState());
  const beforeState = structuredClone(state);
  const beforeSource = structuredClone(sourceFragment);
  const beforeTarget = structuredClone(targetFragment);

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state,
      input: {
        moves: [
          {
            instanceId: "wrapper",
            parentInstanceId: "second-parent",
            position: "end",
          },
          {
            instanceId: "child",
            parentInstanceId: "second-parent",
            position: "end",
          },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: sourceFragment },
          {
            identity: identity("page:/second", "second-block", "second"),
            fragment: targetFragment,
          },
        ],
      },
    })
  ).toThrow("Overlapping cross-root ownership transfers");
  expect(state).toEqual(beforeState);
  expect(sourceFragment).toEqual(beforeSource);
  expect(targetFragment).toEqual(beforeTarget);
});

test("keeps a repeated cross-root move as a noop after ownership changes", () => {
  const sourceIdentity = identity("page:/post");
  const targetIdentity = identity("page:/second", "second-block", "second");

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state: addSecondSourceBlock(createStructuralState()),
      input: {
        moves: [
          {
            instanceId: "first",
            parentInstanceId: "second-parent",
            position: "end",
          },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: sourceIdentity,
            fragment: siblingFragment("parent", []),
          },
          {
            identity: targetIdentity,
            fragment: siblingFragment("second-parent", ["second", "first"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: undefined,
    noop: true,
    result: { instanceIds: ["first"] },
  });
});

test("reparents content between authored storage roots atomically", () => {
  const sourceIdentity = identity("page:/post");
  const targetIdentity = identity("page:/second", "second-block", "second");

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.reparent",
      state: addSecondSourceBlock(createStructuralState()),
      input: {
        sourceInstanceSelector: ["first", "parent", "block"],
        dropTarget: {
          parentSelector: ["second-parent", "second-block"],
          position: "end",
        },
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: sourceIdentity,
            fragment: siblingFragment("parent", ["first"]),
          },
          {
            identity: targetIdentity,
            fragment: siblingFragment("second-parent", ["second"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      { root: { type: "external", identity: sourceIdentity } },
      { root: { type: "external", identity: targetIdentity } },
    ],
    result: {
      instanceSelector: ["first", "second-parent", "second-block"],
    },
  });
});

test("moves project content into authored storage atomically", () => {
  const state = createStructuralState();
  state.instances?.set("project-parent", {
    type: "instance",
    id: "project-parent",
    component: elementComponent,
    tag: "div",
    children: [{ type: "id", value: "project-child" }],
  });
  state.instances?.set("project-child", {
    type: "instance",
    id: "project-child",
    component: elementComponent,
    tag: "p",
    children: [{ type: "text", value: "Project" }],
  });
  const targetIdentity = identity("page:/post");

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state,
      input: {
        moves: [
          {
            instanceId: "project-child",
            parentInstanceId: "parent",
            position: "end",
          },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: targetIdentity,
            fragment: siblingFragment("parent", ["first"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [
      {
        namespace: "instances",
        patches: expect.arrayContaining([
          { op: "remove", path: ["project-child"] },
          { op: "remove", path: ["project-parent", "children", 0] },
        ]),
      },
    ],
    storageChanges: [{ root: { type: "external", identity: targetIdentity } }],
    result: { instanceIds: ["project-child"] },
  });
});

test("moves content across nested authored ownership boundaries", () => {
  const { parentIdentity, nestedIdentity, roots } =
    createNestedMaterializedContent();
  roots[0].fragment.instances[0].tag = "p";
  roots[1].fragment.instances[0].tag = "div";

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state: createStructuralState(),
      input: {
        moves: [
          {
            instanceId: "nested-content",
            parentInstanceId: "outer-rich-text",
            position: "end",
          },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      { root: { type: "external", identity: nestedIdentity } },
      { root: { type: "external", identity: parentIdentity } },
    ],
    result: { instanceIds: ["nested-content"] },
  });
});

test("rejects moving a data source referenced outside its subtree atomically", () => {
  const state = createStructuralState();
  state.instances?.set("project-parent", {
    type: "instance",
    id: "project-parent",
    component: elementComponent,
    tag: "div",
    children: [],
  });
  const externalFragment = siblingFragment("parent", ["first", "outside"]);
  externalFragment.dataSources = [
    {
      id: "first-data",
      scopeInstanceId: "first",
      name: "First",
      type: "variable",
      value: { type: "string", value: "First" },
    },
  ];
  const outside = externalFragment.instances.find(
    (instance) => instance.id === "outside"
  );
  if (outside !== undefined) {
    outside.children = [
      { type: "expression", value: encodeDataVariableId("first-data") },
    ];
  }
  const beforeState = structuredClone(state);
  const beforeFragment = structuredClone(externalFragment);

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state,
      input: {
        moves: [
          {
            instanceId: "first",
            parentInstanceId: "project-parent",
            position: "end",
          },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: externalFragment },
        ],
      },
    })
  ).toThrow("data source referenced outside the moved subtree");
  expect(state).toEqual(beforeState);
  expect(externalFragment).toEqual(beforeFragment);
});

test.each([
  {
    reference: "text expression",
    configure: (externalFragment: WebstudioFragment) => {
      const moved = externalFragment.instances.find(
        (instance) => instance.id === "first"
      );
      if (moved !== undefined) {
        moved.children = [
          { type: "expression", value: encodeDataVariableId("outside-data") },
        ];
      }
    },
  },
  {
    reference: "parameter prop",
    configure: (externalFragment: WebstudioFragment) => {
      externalFragment.props.push({
        id: "first-parameter",
        instanceId: "first",
        name: "value",
        type: "parameter",
        value: "outside-data",
      });
    },
  },
  {
    reference: "action prop",
    configure: (externalFragment: WebstudioFragment) => {
      externalFragment.props.push({
        id: "first-action",
        instanceId: "first",
        name: "onClick",
        type: "action",
        value: [
          {
            type: "execute",
            args: [],
            code: encodeDataVariableId("outside-data"),
          },
        ],
      });
    },
  },
  {
    reference: "resource expression",
    configure: (externalFragment: WebstudioFragment) => {
      externalFragment.props.push({
        id: "first-resource-prop",
        instanceId: "first",
        name: "resource",
        type: "resource",
        value: "first-resource",
      });
      externalFragment.resources.push({
        id: "first-resource",
        name: "First",
        method: "get",
        url: encodeDataVariableId("outside-data"),
        headers: [],
      });
    },
  },
  {
    reference: "page prop instance",
    configure: (externalFragment: WebstudioFragment) => {
      externalFragment.props.push({
        id: "first-page",
        instanceId: "first",
        name: "href",
        type: "page",
        value: { pageId: "page", instanceId: "outside" },
      });
    },
  },
])(
  "rejects a moved $reference that would cross storage roots",
  ({ configure }) => {
    const state = addSecondSourceBlock(createStructuralState());
    const sourceFragment = siblingFragment("parent", ["first", "outside"]);
    sourceFragment.dataSources.push({
      id: "outside-data",
      scopeInstanceId: "outside",
      name: "Outside",
      type: "variable",
      value: { type: "string", value: "Outside" },
    });
    configure(sourceFragment);
    const targetFragment = siblingFragment("second-parent", ["second"]);
    const beforeState = structuredClone(state);
    const beforeSource = structuredClone(sourceFragment);
    const beforeTarget = structuredClone(targetFragment);

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "instances.move",
        state,
        input: {
          moves: [
            {
              instanceId: "first",
              parentInstanceId: "second-parent",
              position: "end",
            },
          ],
        },
        context: {
          createId: createIdFactory(),
          returnStorageChanges: true,
          materializedContent: [
            { identity: identity("page:/post"), fragment: sourceFragment },
            {
              identity: identity("page:/second", "second-block", "second"),
              fragment: targetFragment,
            },
          ],
        },
      })
    ).toThrow("reference crosses an authored storage boundary");
    expect(state).toEqual(beforeState);
    expect(sourceFragment).toEqual(beforeSource);
    expect(targetFragment).toEqual(beforeTarget);
  }
);

test.each([
  {
    reference: "instance child",
    configure: (externalFragment: WebstudioFragment) => {
      const outside = externalFragment.instances.find(
        (instance) => instance.id === "outside"
      );
      if (outside !== undefined) {
        outside.children = [{ type: "id", value: "first" }];
      }
    },
  },
  {
    reference: "page prop",
    configure: (externalFragment: WebstudioFragment) => {
      externalFragment.props.push({
        id: "outside-page",
        instanceId: "outside",
        name: "href",
        type: "page",
        value: { pageId: "page", instanceId: "first" },
      });
    },
  },
])("rejects a $reference left behind by a cross-root move", ({ configure }) => {
  const sourceFragment = siblingFragment("parent", ["first", "outside"]);
  configure(sourceFragment);

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state: addSecondSourceBlock(createStructuralState()),
      input: {
        moves: [
          {
            instanceId: "first",
            parentInstanceId: "second-parent",
            position: "end",
          },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: sourceFragment },
          {
            identity: identity("page:/second", "second-block", "second"),
            fragment: siblingFragment("second-parent", ["second"]),
          },
        ],
      },
    })
  ).toThrow("reference crosses an authored storage boundary");
});

test("partitions deletion across project and authored roots", () => {
  const state = addSecondSourceBlock(createStructuralState());
  state.instances?.get("templates")?.children.push({
    type: "id",
    value: "project-child",
  });
  state.instances?.set("project-child", {
    type: "instance",
    id: "project-child",
    component: elementComponent,
    tag: "p",
    children: [],
  });
  const firstIdentity = identity("page:/post");
  const secondIdentity = identity("page:/second", "second-block", "second");

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.delete",
      state,
      input: { instanceIds: ["first", "project-child", "second"] },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: firstIdentity,
            fragment: siblingFragment("first-parent", ["first"]),
          },
          {
            identity: secondIdentity,
            fragment: siblingFragment("second-parent", ["second"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [expect.objectContaining({ namespace: "instances" })],
    storageChanges: [
      { root: { type: "external", identity: firstIdentity } },
      { root: { type: "external", identity: secondIdentity } },
    ],
    result: { instanceIds: ["first", "project-child", "second"] },
  });
  expect(state.instances?.has("project-child")).toEqual(true);
});

test("routes deletion to the innermost nested storage root", () => {
  const { nestedIdentity, roots } = createNestedMaterializedContent();

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.delete",
      state: createStructuralState(),
      input: { instanceIds: ["nested-content"] },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [{ root: { type: "external", identity: nestedIdentity } }],
    result: { instanceIds: ["nested-content"] },
  });
});

test("keeps deleted authored local styles in the same storage root", () => {
  const externalIdentity = identity("page:/post");
  const externalFragment = fragment("external");
  externalFragment.styleSources = [{ type: "local", id: "external-style" }];
  externalFragment.styleSourceSelections = [
    { instanceId: "external", values: ["external-style"] },
  ];
  externalFragment.styles = [
    {
      styleSourceId: "external-style",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ];

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.delete",
      state: createStructuralState(),
      input: { instanceIds: ["external"] },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: expect.arrayContaining([
          expect.objectContaining({ namespace: "instances" }),
          expect.objectContaining({ namespace: "styleSourceSelections" }),
          expect.objectContaining({ namespace: "styleSources" }),
          expect.objectContaining({ namespace: "styles" }),
        ]),
      },
    ],
  });
});

test("rejects a protected Templates deletion before returning other roots", () => {
  const state = createStructuralState();

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.delete",
      state,
      input: { instanceIds: ["external", "templates"] },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: fragment("external") },
        ],
      },
    })
  ).toThrow("Templates list cannot be changed");
  expect(state.instances?.has("templates")).toEqual(true);
});

test("rejects moving the protected Templates list through project storage", () => {
  const state = createStructuralState();
  state.instances?.set("project-container", {
    type: "instance",
    id: "project-container",
    component: elementComponent,
    tag: "div",
    children: [],
  });

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.move",
      state,
      input: {
        moves: [
          {
            instanceId: "templates",
            parentInstanceId: "project-container",
            position: "end",
          },
        ],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: fragment("external") },
        ],
      },
    })
  ).toThrow("Templates list cannot be changed");
  expect(state.instances?.get("block")?.children).toEqual([
    { type: "id", value: "templates" },
  ]);
});

test("wraps authored content within its storage root", () => {
  const externalIdentity = identity("page:/post");
  const externalFragment = siblingFragment("parent", ["selected"]);

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.wrap",
      state: createStructuralState(),
      input: {
        instanceSelector: ["selected", "parent", "block"],
        component: elementComponent,
        tag: "section",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      { root: { type: "external", identity: externalIdentity } },
    ],
    result: { instanceSelector: ["generated-0", "parent", "block"] },
  });

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.wrap",
      state: createStructuralState(),
      input: {
        instanceSelector: ["selected", "parent", "block"],
        component: elementComponent,
        tag: "section",
      },
      context: {
        createId: createIdFactory(),
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toThrow("must handle authored storage changes");
});

test("normalizes an authored legacy Slot before wrapping its child", () => {
  const externalIdentity = identity("page:/post");
  const externalFragment = siblingFragment("body", []);
  externalFragment.instances[0].children = [{ type: "id", value: "slot" }];
  externalFragment.instances.push(
    {
      type: "instance",
      id: "slot",
      component: "Slot",
      children: [{ type: "id", value: "selected" }],
    },
    {
      type: "instance",
      id: "selected",
      component: elementComponent,
      tag: "p",
      children: [{ type: "text", value: "Selected" }],
    }
  );

  const mutation = executeBuilderRuntimeOperation({
    id: "instances.wrap",
    state: createStructuralState(),
    input: {
      instanceSelector: ["selected", "slot", "body", "block"],
      component: elementComponent,
      tag: "section",
    },
    context: {
      createId: createIdFactory(),
      returnStorageChanges: true,
      materializedContent: [
        { identity: externalIdentity, fragment: externalFragment },
      ],
    },
  });

  expect(mutation).toMatchObject({
    payload: [],
    storageChanges: [
      { root: { type: "external", identity: externalIdentity } },
    ],
    result: {
      instanceSelector: ["generated-1", "generated-0", "slot", "body", "block"],
    },
  });
});

test("unwraps authored content within its storage root", () => {
  const externalIdentity = identity("page:/post");
  const externalFragment = siblingFragment("grandparent", []);
  externalFragment.instances[0].children = [{ type: "id", value: "wrapper" }];
  externalFragment.instances.push(
    {
      type: "instance",
      id: "wrapper",
      component: elementComponent,
      tag: "div",
      children: [{ type: "id", value: "selected" }],
    },
    {
      type: "instance",
      id: "selected",
      component: elementComponent,
      tag: "p",
      children: [{ type: "text", value: "Selected" }],
    }
  );

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.unwrap",
      state: createStructuralState(),
      input: {
        instanceSelector: ["selected", "wrapper", "grandparent", "block"],
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: externalIdentity, fragment: externalFragment },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      { root: { type: "external", identity: externalIdentity } },
    ],
    result: { instanceSelector: ["selected", "grandparent", "block"] },
  });
});

test("keeps an authored wrapper when unwrapping one of multiple children", () => {
  const externalIdentity = identity("page:/post");
  const externalFragment = siblingFragment("grandparent", []);
  externalFragment.instances[0].children = [{ type: "id", value: "wrapper" }];
  externalFragment.instances.push(
    {
      type: "instance",
      id: "wrapper",
      component: elementComponent,
      tag: "div",
      children: [
        { type: "id", value: "selected" },
        { type: "id", value: "sibling" },
      ],
    },
    {
      type: "instance",
      id: "selected",
      component: elementComponent,
      tag: "p",
      children: [{ type: "text", value: "Selected" }],
    },
    {
      type: "instance",
      id: "sibling",
      component: elementComponent,
      tag: "p",
      children: [{ type: "text", value: "Sibling" }],
    }
  );

  const mutation = executeBuilderRuntimeOperation({
    id: "instances.unwrap",
    state: createStructuralState(),
    input: {
      instanceSelector: ["selected", "wrapper", "grandparent", "block"],
    },
    context: {
      createId: createIdFactory(),
      returnStorageChanges: true,
      materializedContent: [
        { identity: externalIdentity, fragment: externalFragment },
      ],
    },
  });

  expect(mutation).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: externalIdentity },
        payload: [
          {
            namespace: "instances",
            patches: [
              { op: "remove", path: ["wrapper", "children", 0] },
              {
                op: "add",
                path: ["grandparent", "children", 1],
                value: { type: "id", value: "selected" },
              },
            ],
          },
        ],
      },
    ],
    result: { instanceSelector: ["selected", "grandparent", "block"] },
  });
});

test.each([
  { operation: "clone", id: "instances.clone" as const },
  {
    operation: "duplicate",
    id: "instances.duplicateAfterItself" as const,
  },
])("copies authored content with $operation in the same root", ({ id }) => {
  const externalIdentity = identity("page:/post");

  expect(
    executeBuilderRuntimeOperation({
      id,
      state: createStructuralState(),
      input:
        id === "instances.clone"
          ? { sourceInstanceId: "selected", targetParentInstanceId: "parent" }
          : { sourceInstanceId: "selected", parentInstanceId: "parent" },
      context: {
        createId: createIdFactory(),
        projectId: "project",
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: externalIdentity,
            fragment: siblingFragment("parent", ["selected"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      { root: { type: "external", identity: externalIdentity } },
    ],
    result: { instanceId: "generated-0" },
  });
});

test("copies content in the innermost nested storage root", () => {
  const { nestedIdentity, roots } = createNestedMaterializedContent();

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.clone",
      state: createStructuralState(),
      input: { sourceInstanceId: "nested-content" },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: roots,
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [{ root: { type: "external", identity: nestedIdentity } }],
    result: { instanceId: "generated-0" },
  });
});

test("copies authored content into project ownership", () => {
  const state = createStructuralState();
  state.instances?.set("project-root", {
    type: "instance",
    id: "project-root",
    component: elementComponent,
    tag: "main",
    children: [
      { type: "id", value: "block" },
      { type: "id", value: "project-parent" },
    ],
  });
  state.instances?.set("project-parent", {
    type: "instance",
    id: "project-parent",
    component: elementComponent,
    tag: "div",
    children: [],
  });
  state.pages = createDefaultPages({ rootInstanceId: "project-root" });

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.clone",
      state,
      input: {
        sourceInstanceId: "selected",
        targetParentInstanceId: "project-parent",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: siblingFragment("parent", ["selected"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [expect.objectContaining({ namespace: "instances" })],
    storageChanges: undefined,
    result: { instanceId: "generated-0" },
  });
});

test("copies content between authored storage roots", () => {
  const state = addSecondSourceBlock(createStructuralState());
  state.instances?.set("project-root", {
    type: "instance",
    id: "project-root",
    component: elementComponent,
    tag: "main",
    children: [
      { type: "id", value: "block" },
      { type: "id", value: "second-block" },
    ],
  });
  state.pages = createDefaultPages({ rootInstanceId: "project-root" });
  const targetIdentity = identity("page:/second", "second-block", "second");
  const sourceFragment = siblingFragment("parent", ["selected"]);
  sourceFragment.dataSources = [
    {
      id: "selected-data",
      scopeInstanceId: "selected",
      name: "Posts",
      type: "resource",
      resourceId: "selected-resource",
    },
  ];
  sourceFragment.resources = [
    {
      id: "selected-resource",
      name: "Posts",
      method: "get",
      url: '"/posts"',
      headers: [],
    },
  ];
  sourceFragment.props = [
    {
      id: "selected-asset",
      instanceId: "selected",
      name: "src",
      type: "asset",
      value: "article",
    },
  ];

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.clone",
      state,
      input: {
        sourceInstanceId: "selected",
        targetParentInstanceId: "second-parent",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: sourceFragment,
          },
          {
            identity: targetIdentity,
            fragment: siblingFragment("second-parent", ["second"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: targetIdentity },
        payload: expect.arrayContaining([
          expect.objectContaining({ namespace: "instances" }),
          expect.objectContaining({
            namespace: "props",
            patches: expect.arrayContaining([
              expect.objectContaining({
                value: expect.objectContaining({ value: "article" }),
              }),
            ]),
          }),
          expect.objectContaining({ namespace: "dataSources" }),
          expect.objectContaining({ namespace: "resources" }),
        ]),
      },
    ],
    result: { instanceId: "generated-0" },
  });
});

test("remaps portal content when copying across storage roots", () => {
  const state = addSecondSourceBlock(createStructuralState());
  state.instances?.set("project-root", {
    type: "instance",
    id: "project-root",
    component: elementComponent,
    tag: "main",
    children: [
      { type: "id", value: "block" },
      { type: "id", value: "second-block" },
    ],
  });
  state.pages = createDefaultPages({ rootInstanceId: "project-root" });
  const sourceFragment = siblingFragment("parent", ["first"]);
  const source = sourceFragment.instances.find(
    (instance) => instance.id === "first"
  );
  if (source !== undefined) {
    source.component = portalComponent;
    source.tag = "div";
    source.children = [{ type: "id", value: "portal-content" }];
  }
  sourceFragment.instances.push({
    type: "instance",
    id: "portal-content",
    component: elementComponent,
    tag: "p",
    children: [{ type: "text", value: "Portal" }],
  });
  const targetIdentity = identity("page:/second", "second-block", "second");
  const targetFragment = siblingFragment("second-parent", ["second"]);
  targetFragment.instances[0].tag = "div";

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.clone",
      state,
      input: {
        sourceInstanceId: "first",
        targetParentInstanceId: "second-parent",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: sourceFragment },
          {
            identity: targetIdentity,
            fragment: targetFragment,
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: targetIdentity },
        payload: [
          {
            namespace: "instances",
            patches: expect.arrayContaining([
              expect.objectContaining({
                path: ["generated-0"],
                value: expect.objectContaining({
                  children: [{ type: "id", value: "generated-1" }],
                }),
              }),
              expect.objectContaining({ path: ["generated-1"] }),
            ]),
          },
        ],
      },
    ],
    result: { instanceId: "generated-0" },
  });
});

test("rejects duplicating authored content into another storage root", () => {
  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.duplicateAfterItself",
      state: addSecondSourceBlock(createStructuralState()),
      input: {
        sourceInstanceId: "selected",
        parentInstanceId: "second-parent",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: siblingFragment("parent", ["selected"]),
          },
          {
            identity: identity("page:/second", "second-block", "second"),
            fragment: siblingFragment("second-parent", ["second"]),
          },
        ],
      },
    })
  ).toThrow("Copying content across authored storage roots is not supported");
});

test("copies project content into authored storage", () => {
  const state = createStructuralState();
  state.instances?.set("project-parent", {
    type: "instance",
    id: "project-parent",
    component: elementComponent,
    tag: "div",
    children: [{ type: "id", value: "project-selected" }],
  });
  state.instances?.set("project-selected", {
    type: "instance",
    id: "project-selected",
    component: elementComponent,
    tag: "p",
    children: [{ type: "text", value: "Project" }],
  });
  state.dataSources?.set("project-data", {
    id: "project-data",
    scopeInstanceId: "project-selected",
    name: "Posts",
    type: "resource",
    resourceId: "project-resource",
  });
  state.resources?.set("project-resource", {
    id: "project-resource",
    name: "Posts",
    method: "get",
    url: '"/posts"',
    headers: [],
  });
  const beforeState = structuredClone(state);

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.clone",
      state,
      input: {
        sourceInstanceId: "project-selected",
        targetParentInstanceId: "parent",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: siblingFragment("parent", ["selected"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [],
    storageChanges: [
      {
        root: { type: "external", identity: identity("page:/post") },
        payload: expect.arrayContaining([
          expect.objectContaining({ namespace: "instances" }),
          expect.objectContaining({
            namespace: "dataSources",
            patches: expect.arrayContaining([
              expect.objectContaining({
                path: ["generated-1"],
                value: expect.objectContaining({
                  scopeInstanceId: "generated-0",
                  resourceId: "generated-2",
                }),
              }),
            ]),
          }),
          expect.objectContaining({
            namespace: "resources",
            patches: expect.arrayContaining([
              expect.objectContaining({ path: ["generated-2"] }),
            ]),
          }),
        ]),
      },
    ],
    result: { instanceId: "generated-0" },
  });
  expect(state).toEqual(beforeState);
});

test("rejects cross-root clone id collisions without changing either root", () => {
  const state = createStructuralState();
  state.instances?.set("project-selected", {
    type: "instance",
    id: "project-selected",
    component: elementComponent,
    tag: "p",
    children: [{ type: "text", value: "Project" }],
  });
  const externalFragment = siblingFragment("parent", ["selected"]);
  const beforeState = structuredClone(state);
  const beforeFragment = structuredClone(externalFragment);

  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.clone",
      state,
      input: {
        sourceInstanceId: "project-selected",
        targetParentInstanceId: "parent",
      },
      context: {
        createId: () => "parent",
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: externalFragment },
        ],
      },
    })
  ).toThrow('Generated instance id "parent" already exists');
  expect(state).toEqual(beforeState);
  expect(externalFragment).toEqual(beforeFragment);
});

test("uses the resolved implicit parent for a cross-root clone", () => {
  const state = createStructuralState();
  state.instances?.set("project-root", {
    type: "instance",
    id: "project-root",
    component: elementComponent,
    tag: "main",
    children: [
      { type: "id", value: "project-parent" },
      { type: "id", value: "block" },
    ],
  });
  state.instances?.set("project-parent", {
    type: "instance",
    id: "project-parent",
    component: elementComponent,
    tag: "div",
    children: [{ type: "id", value: "selected" }],
  });
  state.pages = createDefaultPages({ rootInstanceId: "project-root" });

  expect(
    executeBuilderRuntimeOperation({
      id: "instances.clone",
      state,
      input: { sourceInstanceId: "selected" },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          {
            identity: identity("page:/post"),
            fragment: siblingFragment("external-parent", ["selected"]),
          },
        ],
      },
    })
  ).toMatchObject({
    payload: [expect.objectContaining({ namespace: "instances" })],
    storageChanges: undefined,
    result: { instanceId: "generated-0" },
  });
});

test("rejects copying the protected Templates list", () => {
  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.clone",
      state: createStructuralState(),
      input: {
        sourceInstanceId: "templates",
        targetParentInstanceId: "block",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: fragment("external") },
        ],
      },
    })
  ).toThrow("Templates list cannot be changed");
});

test("rejects wrapping the protected Templates list", () => {
  expect(() =>
    executeBuilderRuntimeOperation({
      id: "instances.wrap",
      state: createStructuralState(),
      input: {
        instanceSelector: ["templates", "block"],
        component: elementComponent,
        tag: "div",
      },
      context: {
        createId: createIdFactory(),
        returnStorageChanges: true,
        materializedContent: [
          { identity: identity("page:/post"), fragment: fragment("external") },
        ],
      },
    })
  ).toThrow("Templates list cannot be changed");
});
