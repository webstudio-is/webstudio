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
  const projection = createContentStorageProjection({
    state,
    materializedRoots: [
      { identity: nestedIdentity, fragment: fragment("nested-content") },
      { identity: parentIdentity, fragment: parentFragment },
    ],
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
