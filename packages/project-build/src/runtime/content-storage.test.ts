import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
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
