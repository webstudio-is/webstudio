import { afterEach, expect, test } from "vitest";
import type { Project } from "@webstudio-is/project";
import type { MaterializedMdxAuthoredContentRoot } from "@webstudio-is/project-build/runtime";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type ContentBlockExternalContentIdentity,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import {
  $instances,
  $project,
  $props,
  $assets,
  $breakpoints,
  $dataSources,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
  resetDataStores,
} from "./sync/data-stores";
import {
  $contentBlockPresentationItems,
  $materializedContentViewStates,
  $runtimeInstances,
  formatContentBlockDiagnostic,
  getMaterializedContentViewStateFromSession,
  getRuntimeInstanceChildren,
  publishMaterializedContentRoot,
  publishMaterializedContentSessionState,
  $materializedContentRoots,
  resetMaterializedContent,
  setMaterializedContentStatus,
  takeNewContentBlockDiagnostics,
} from "./content-block-content";

const identity = (
  renderScope: string
): ContentBlockExternalContentIdentity => ({
  blockInstanceId: "block",
  assetId: renderScope,
  revision: `sha256:${renderScope}`,
  contentRef: `${renderScope}.mdx`,
  format: "mdx",
  renderScope,
});

const fragment = (id: string): WebstudioFragment => ({
  children: [{ type: "id", value: id }],
  instances: [
    {
      type: "instance",
      id,
      component: elementComponent,
      tag: "p",
      children: [{ type: "text", value: id }],
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

afterEach(() => {
  resetMaterializedContent();
  resetDataStores();
  $project.set(undefined);
});

test("projects repeated MDX roots by selector without changing persisted instances", () => {
  $project.set({ id: "project" } as Project);
  const persistedBlock = {
    type: "instance" as const,
    id: "block",
    component: blockComponent,
    children: [{ type: "id" as const, value: "templates" }],
  };
  $instances.set(
    new Map([
      [persistedBlock.id, persistedBlock],
      [
        "templates",
        {
          type: "instance" as const,
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
      ],
    ])
  );
  $props.set(
    new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "expression" as const,
          value: "article",
        },
      ],
    ])
  );
  $assets.set(new Map());
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  const firstScope = JSON.stringify(["block", "collection[0]"]);
  const secondScope = JSON.stringify(["block", "collection[1]"]);
  publishMaterializedContentRoot({
    identity: identity(firstScope),
    fragment: fragment("first-content"),
  });
  publishMaterializedContentRoot({
    identity: identity(secondScope),
    fragment: fragment("second-content"),
  });

  const runtimeBlock = $runtimeInstances.get().get("block");
  if (runtimeBlock === undefined) {
    throw new Error("Expected projected Content Block");
  }
  expect($runtimeInstances.get().has("first-content")).toBe(true);
  expect($runtimeInstances.get().has("second-content")).toBe(true);
  expect(
    getRuntimeInstanceChildren(runtimeBlock, ["block", "collection[0]"])
  ).toEqual([
    { type: "id", value: "templates" },
    { type: "id", value: "first-content" },
  ]);
  expect(
    getRuntimeInstanceChildren(runtimeBlock, ["block", "collection[1]"])
  ).toEqual([
    { type: "id", value: "templates" },
    { type: "id", value: "second-content" },
  ]);
  expect($instances.get()).toEqual(
    new Map([
      [persistedBlock.id, persistedBlock],
      [
        "templates",
        {
          type: "instance",
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
      ],
    ])
  );

  $props.set(
    new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "asset",
          value: "replacement",
        },
      ],
    ])
  );
  expect($runtimeInstances.get().has("first-content")).toBe(true);

  $props.set(new Map());
  expect($runtimeInstances.get().has("first-content")).toBe(false);
  expect($runtimeInstances.get().get("block")?.children).toEqual([
    { type: "id", value: "templates" },
  ]);

  $props.set(
    new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "expression",
          value: "article",
        },
      ],
    ])
  );
  publishMaterializedContentRoot({
    identity: identity(firstScope),
    fragment: fragment("first-content"),
  });
  expect($runtimeInstances.get().has("first-content")).toBe(true);

  $project.set({ id: "other-project" } as Project);
  expect($runtimeInstances.get().has("first-content")).toBe(false);
});

test("projects selectable Builder-only loading and unresolved-template notices per exact scope", () => {
  $project.set({ id: "project" } as Project);
  const block = {
    type: "instance" as const,
    id: "block",
    component: blockComponent,
    children: [{ type: "id" as const, value: "templates" }],
  };
  $instances.set(
    new Map([
      [block.id, block],
      [
        "templates",
        {
          type: "instance" as const,
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
      ],
    ])
  );
  $props.set(
    new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "asset" as const,
          value: "article",
        },
      ],
    ])
  );
  const renderScope = JSON.stringify(["block", "collection[1]"]);
  setMaterializedContentStatus({
    blockInstanceId: "block",
    renderScope,
    status: "loading",
  });

  const loadingChildren = getRuntimeInstanceChildren(block, [
    "block",
    "collection[1]",
  ]);
  const loadingId = loadingChildren.at(-1)?.value;
  expect(
    $contentBlockPresentationItems.get().get(loadingId ?? "")
  ).toMatchObject({
    blockInstanceId: "block",
    renderScope,
    kind: "loading",
    label: "Loading MDX",
  });
  expect($instances.get().has(loadingId ?? "")).toBe(false);
  $instances.set(
    new Map($instances.get()).set(loadingId ?? "", {
      type: "instance",
      id: loadingId ?? "",
      component: elementComponent,
      tag: "div",
      children: [],
    })
  );
  const collisionSafeLoadingId = getRuntimeInstanceChildren(block, [
    "block",
    "collection[1]",
  ]).at(-1)?.value;
  expect(collisionSafeLoadingId).toBe(`${loadingId}-1`);
  expect(
    $contentBlockPresentationItems.get().get(collisionSafeLoadingId ?? "")
  ).toMatchObject({ kind: "loading" });
  const otherRenderScope = JSON.stringify(["block", "collection[2]"]);
  setMaterializedContentStatus({
    blockInstanceId: "block",
    renderScope: otherRenderScope,
    status: "loading",
  });
  const otherLoadingId = getRuntimeInstanceChildren(block, [
    "block",
    "collection[2]",
  ]).at(-1)?.value;
  expect(otherLoadingId).not.toBe(loadingId);
  expect(
    getRuntimeInstanceChildren(block, ["block", "collection[1]"])
  ).not.toContainEqual({ type: "id", value: otherLoadingId });

  const diagnostic = {
    code: "unresolved-template" as const,
    severity: "warning" as const,
    blockInstanceId: "block",
    assetId: "article",
    contentRef: "article.mdx",
    renderScope,
    templateName: "Hero Card",
    sourceRange: {
      start: { line: 4, column: 2 },
      end: { line: 4, column: 35 },
    },
  };
  publishMaterializedContentRoot(
    { identity: identity(renderScope), fragment: fragment("content") },
    [diagnostic]
  );
  const warningChildren = getRuntimeInstanceChildren(block, [
    "block",
    "collection[1]",
  ]);
  const warningId = warningChildren.at(-1)?.value;
  expect(
    $contentBlockPresentationItems.get().get(warningId ?? "")
  ).toMatchObject({
    kind: "warning",
    label: "Missing template: Hero Card",
    message:
      'Template "Hero Card" is not available and was skipped. Line 4, column 2.',
  });
  expect(
    $materializedContentViewStates
      .get()
      .get(JSON.stringify(["block", renderScope]))
  ).toMatchObject({ status: "ready", diagnostics: [diagnostic] });
  expect($instances.get()).not.toBe($runtimeInstances.get());
  expect($instances.get().has(warningId ?? "")).toBe(false);
});

test("projects duplicate unresolved templates at their exact nested authored positions", () => {
  $project.set({ id: "project" } as Project);
  const block = {
    type: "instance" as const,
    id: "block",
    component: blockComponent,
    children: [{ type: "id" as const, value: "templates" }],
  };
  const wrapper = {
    type: "instance" as const,
    id: "wrapper",
    component: elementComponent,
    tag: "div",
    children: [
      { type: "text" as const, value: "Before" },
      { type: "text" as const, value: "After" },
    ],
  };
  $instances.set(
    new Map([
      [block.id, block],
      [
        "templates",
        {
          type: "instance" as const,
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
      ],
    ])
  );
  $props.set(
    new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "asset" as const,
          value: "article",
        },
      ],
    ])
  );
  const renderScope = JSON.stringify(["block"]);
  const makeDiagnostic = (line: number) => ({
    code: "unresolved-template" as const,
    severity: "warning" as const,
    blockInstanceId: "block",
    assetId: "article",
    contentRef: "article.mdx",
    renderScope,
    templateName: "Card",
    sourceRange: {
      start: { line, column: 1 },
      end: { line, column: 20 },
    },
  });
  const root: MaterializedMdxAuthoredContentRoot = {
    identity: identity(renderScope),
    fragment: {
      ...fragment("unused"),
      children: [{ type: "id", value: wrapper.id }],
      instances: [wrapper],
    },
    document: {
      frontmatter: { properties: {} },
      children: [
        {
          type: "element",
          syntax: "mdx",
          tag: "div",
          props: [],
          mdxMode: "flow",
          children: [
            { type: "text", value: "Before" },
            {
              type: "template",
              name: "Card",
              props: [],
              children: [],
              mdxMode: "flow",
            },
            {
              type: "template",
              name: "Card",
              props: [],
              children: [],
              mdxMode: "flow",
            },
            { type: "text", value: "After" },
          ],
        },
      ],
    },
    provenance: {
      nodes: [
        {
          type: "element",
          path: [0],
          instanceId: wrapper.id,
          assetProps: [],
        },
      ],
      unresolvedTemplates: [
        {
          path: [0, 1],
          markerId: "first-card",
          templateName: "Card",
        },
        {
          path: [0, 2],
          markerId: "second-card",
          templateName: "Card",
        },
      ],
    },
  };
  publishMaterializedContentRoot(root, [makeDiagnostic(2), makeDiagnostic(3)]);

  const children = getRuntimeInstanceChildren(wrapper, ["block"]);
  const firstWarningId = children[1]?.type === "id" ? children[1].value : "";
  const secondWarningId = children[2]?.type === "id" ? children[2].value : "";
  expect(children).toEqual([
    { type: "text", value: "Before" },
    { type: "id", value: firstWarningId },
    { type: "id", value: secondWarningId },
    { type: "text", value: "After" },
  ]);
  expect(firstWarningId).not.toBe(secondWarningId);
  expect(
    $contentBlockPresentationItems.get().get(firstWarningId ?? "")
  ).toMatchObject({ diagnostic: { sourceRange: { start: { line: 2 } } } });
  expect(
    $contentBlockPresentationItems.get().get(secondWarningId ?? "")
  ).toMatchObject({ diagnostic: { sourceRange: { start: { line: 3 } } } });
  expect($instances.get().has(firstWarningId ?? "")).toBe(false);
  expect($instances.get().has(secondWarningId ?? "")).toBe(false);
});

test("formats and deduplicates diagnostics by revision without losing detail", () => {
  const diagnostic = {
    code: "ignored-template-prop" as const,
    severity: "warning" as const,
    blockInstanceId: "block",
    assetId: "article",
    contentRef: "article.mdx",
    renderScope: "scope",
    templateName: "Hero",
    propName: "tone",
    reason: "design-only" as const,
    sourceRange: {
      start: { line: 2, column: 3 },
      end: { line: 2, column: 12 },
    },
  };
  expect(formatContentBlockDiagnostic(diagnostic)).toBe(
    'Property "tone" on template "Hero" was ignored because it is design only. Line 2, column 3.'
  );
  expect(takeNewContentBlockDiagnostics([diagnostic], "sha256:one")).toEqual([
    diagnostic,
  ]);
  expect(takeNewContentBlockDiagnostics([diagnostic], "sha256:one")).toEqual(
    []
  );
  expect(takeNewContentBlockDiagnostics([diagnostic], "sha256:two")).toEqual([
    diagnostic,
  ]);
});

test("maps empty, unsafe, conflict, and recoverable session states without storing errors", () => {
  const root = {
    identity: identity("scope"),
    fragment: { ...fragment("content"), children: [] },
    document: { frontmatter: { properties: {} }, children: [] },
    provenance: { nodes: [], unresolvedTemplates: [] },
  };
  expect(
    getMaterializedContentViewStateFromSession({
      status: "saved",
      key: "saved",
      identity: root.identity,
      root,
      source: "",
      diagnostics: [],
    })
  ).toMatchObject({ status: "empty", diagnostics: [] });
  const unsafe = {
    code: "unsafe-mdx" as const,
    severity: "error" as const,
    blockInstanceId: "block",
    assetId: "article",
    contentRef: "article.mdx",
    renderScope: "scope",
    nodeType: "mdxFlowExpression",
    reason: "Executable expressions are not allowed",
  };
  expect(
    getMaterializedContentViewStateFromSession({
      status: "recoverable",
      key: "recoverable",
      identity: root.identity,
      diagnostics: [unsafe],
      error: new Error("private parser detail"),
    })
  ).toEqual({
    status: "recoverable",
    identity: root.identity,
    assetId: root.identity.assetId,
    diagnostics: [unsafe],
    hasUnsavedSource: false,
    message:
      "The MDX file could not be rendered. Open the file to repair it, then retry.",
  });
  expect(
    getMaterializedContentViewStateFromSession({
      status: "conflicting",
      key: "conflict",
      identity: root.identity,
      diagnostics: [],
    })
  ).toMatchObject({
    status: "conflicting",
    hasUnsavedSource: false,
  });
});

test("keeps pending and conflicting local MDX visible without marking it editable", () => {
  const renderScope = "scope";
  const root = {
    identity: identity(renderScope),
    fragment: fragment("pending-content"),
    document: { frontmatter: { properties: {} }, children: [] },
    provenance: { nodes: [], unresolvedTemplates: [] },
  };
  const sessionBase = {
    key: "pending",
    identity: root.identity,
    root,
    source: "Before",
    localSource: "After",
    writes: [],
    diagnostics: [],
  };
  publishMaterializedContentSessionState({
    blockInstanceId: "block",
    renderScope,
    state: { ...sessionBase, status: "pending" },
  });
  expect(
    $materializedContentRoots.get().get(JSON.stringify(["block", renderScope]))
  ).toBe(root);
  expect(
    $materializedContentViewStates
      .get()
      .get(JSON.stringify(["block", renderScope]))
  ).toMatchObject({ status: "pending", hasUnsavedSource: true });

  publishMaterializedContentSessionState({
    blockInstanceId: "block",
    renderScope,
    state: {
      ...sessionBase,
      status: "conflicting",
      error: new Error("remote conflict"),
    },
  });
  expect(
    $materializedContentRoots.get().get(JSON.stringify(["block", renderScope]))
  ).toBe(root);
  expect(
    $materializedContentViewStates
      .get()
      .get(JSON.stringify(["block", renderScope]))
  ).toMatchObject({ status: "conflicting", hasUnsavedSource: true });
});
