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
    ...fragment("nested-block"),
    instances: [
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
