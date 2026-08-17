import { describe, expect, test } from "vitest";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type ContentBlockExternalContentIdentity,
} from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import { createDefaultPages } from "../shared/pages-utils";
import { materializeMdxAuthoredContent } from "./mdx-authored-content";
import type { MdxPasteResult } from "./mdx-paste";
import { prepareMdxContentStorageWrites } from "./mdx-storage-adapter";
import type { BuilderRuntimeMutation } from "./mutation";
import { executeBuilderRuntimeOperation } from "./registry";

const identity: ContentBlockExternalContentIdentity = {
  blockInstanceId: "block",
  assetId: "article",
  revision: "sha256:article",
  contentRef: "posts/article.mdx",
  format: "mdx",
  renderScope: "page:/article",
};

const createId = () => {
  let index = 0;
  return () => `generated-${index++}`;
};

const createState = (): BuilderState => ({
  pages: createDefaultPages({ rootInstanceId: "block" }),
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
        children: [{ type: "id", value: "hero" }],
      },
    ],
    [
      "hero",
      {
        type: "instance",
        id: "hero",
        component: elementComponent,
        tag: "article",
        label: "Hero Card",
        children: [{ type: "id", value: "hero-heading" }],
      },
    ],
    [
      "hero-heading",
      {
        type: "instance",
        id: "hero-heading",
        component: elementComponent,
        tag: "h2",
        children: [{ type: "text", value: "Destination template" }],
      },
    ],
  ]),
  props: new Map([
    [
      "src",
      {
        id: "src",
        instanceId: "block",
        name: "src",
        type: "asset",
        value: "article",
      },
    ],
  ]),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
});

const loadRoot = async (source = "Existing") =>
  materializeMdxAuthoredContent({
    identity,
    document: await parseMdxDocument({ source }),
    templateMaterialization: {
      templates: [],
      diagnostics: [],
      dependencies: { templateNames: [], templates: [] },
    },
  });

const paste = async ({
  source,
  loaded = true,
  mode,
  destinationSource = `---\ntitle: Destination\n---\n\nExisting`,
}: {
  source: string;
  loaded?: boolean;
  mode?: "append" | "prepend" | "replace";
  destinationSource?: string;
}) => {
  const root = await loadRoot(destinationSource);
  const state = createState();
  if (loaded === false) {
    state.props?.delete("src");
  }
  const mutation = await executeBuilderRuntimeOperation<
    BuilderRuntimeMutation<MdxPasteResult>
  >({
    id: "instances.insertMdxText",
    state,
    input: { parentInstanceId: "block", source, mode },
    context: {
      createId: createId(),
      projectId: "project",
      returnStorageChanges: true,
      materializedContent: loaded ? [root] : undefined,
    },
  });
  return { root, mutation };
};

describe("pasted MDX", () => {
  test("requires confirmation when replacement changes a template name", async () => {
    const execute = (templateNameConfirmation?: {
      action: "rename";
      templates: Array<{
        instanceId: string;
        oldName: string;
        newName: string;
      }>;
    }) =>
      executeBuilderRuntimeOperation({
        id: "instances.insertMdxText",
        state: createState(),
        input: {
          parentInstanceId: "templates",
          source: "# Replacement",
          mode: "replace",
          templateNameConfirmation,
        },
        context: { createId: createId(), projectId: "project" },
      });

    await expect(execute()).rejects.toMatchObject({
      code: "INVALID_INPUT",
      issues: [
        expect.objectContaining({
          code: "template_name_change_requires_confirmation",
          example: {
            action: "rename",
            templates: [
              {
                instanceId: "hero",
                oldName: "Hero Card",
                newName: "<h1>",
              },
            ],
          },
        }),
      ],
    });
    await expect(
      execute({
        action: "rename",
        templates: [
          {
            instanceId: "hero",
            oldName: "Hero Card",
            newName: "<h1>",
          },
        ],
      })
    ).resolves.toMatchObject({
      result: { removedInstanceIds: ["hero", "hero-heading"] },
    });
  });

  test("resolves names only from the destination Templates list", async () => {
    const source = `---\ntitle: Pasted\n---\n\n# Intro\n\n<ws.element ws:name="Hero Card" />`;
    const { root, mutation } = await paste({
      source,
    });

    expect(mutation.result.diagnostics).toEqual([]);
    expect(mutation.storageChanges?.[0]).toMatchObject({
      root: { type: "external", identity },
      mdxInsert: {
        source,
        parentInstanceId: "block",
      },
    });
    const request = {
      loadedRoots: [root],
      changes: mutation.storageChanges ?? [],
      authorizeAssetWrite: () => true,
    };
    const [write] = await prepareMdxContentStorageWrites(request);
    const [repeatedWrite] = await prepareMdxContentStorageWrites(request);
    const document = await parseMdxDocument({ source: write.source });

    expect(repeatedWrite.source).toBe(write.source);
    expect(document.frontmatter.properties).toEqual({ title: "Destination" });
    expect(document.children.slice(1)).toMatchObject([
      { type: "element", tag: "h1" },
      { type: "template", name: "Hero Card" },
    ]);
    expect(write.source).not.toContain("Destination template");
  });

  test("preserves comments and unresolved nested names without copying templates", async () => {
    const source = `{/* pasted */}\n\n<ws.element ws:tag="section"><ws.element ws:name="Hero Card" /><ws.element ws:name="Other Project Card" /></ws.element>`;
    const { root, mutation } = await paste({
      source,
      mode: "replace",
      destinationSource: `---\ntitle: Destination\n---\n\n{/* old */}\n\n<ws.element ws:name="Old Missing" />`,
    });

    expect(mutation.result.diagnostics).toMatchObject([
      {
        code: "unresolved-template",
        templateName: "Other Project Card",
      },
    ]);
    const [write] = await prepareMdxContentStorageWrites({
      loadedRoots: [root],
      changes: mutation.storageChanges ?? [],
      authorizeAssetWrite: () => true,
    });
    const document = await parseMdxDocument({ source: write.source });

    expect(document.children).toMatchObject([
      { type: "comment", value: "/* pasted */" },
      {
        type: "element",
        tag: "section",
        children: [
          { type: "template", name: "Hero Card" },
          { type: "template", name: "Other Project Card" },
        ],
      },
    ]);
    expect(write.source).not.toContain("Destination template");
  });

  test("rejects invalid and executable MDX", async () => {
    await expect(
      paste({ source: `<ws.element ws:tag="p">` })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(paste({ source: `{alert("unsafe")}` })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  test("persists non-rendered comments and unresolved names as authored text", async () => {
    const source = `{/* note */}\n\n<ws.element ws:name="Missing" />`;
    const { root, mutation } = await paste({ source });

    expect(mutation.noop).toBe(false);
    expect(mutation.result.instanceIds).toEqual([]);
    expect(mutation.result.diagnostics).toMatchObject([
      { code: "unresolved-template", templateName: "Missing" },
    ]);
    const [write] = await prepareMdxContentStorageWrites({
      loadedRoots: [root],
      changes: mutation.storageChanges ?? [],
      authorizeAssetWrite: () => true,
    });
    const document = await parseMdxDocument({ source: write.source });

    expect(document.children.slice(1)).toMatchObject([
      { type: "comment", value: "/* note */" },
      { type: "template", name: "Missing" },
    ]);
  });

  test("positions pasted MDX by rendered children around unresolved names", async () => {
    const destinationSource = `<ws.element ws:name="Missing" />\n\nExisting`;
    const document = await parseMdxDocument({ source: destinationSource });
    const root = materializeMdxAuthoredContent({
      identity,
      document,
      templateMaterialization: {
        templates: [
          {
            type: "unresolved-template",
            reference: {
              type: "unresolved-template",
              path: [0],
              templateName: "Missing",
            },
            markerId: "missing",
          },
        ],
        diagnostics: [],
        dependencies: { templateNames: ["Missing"], templates: [] },
      },
    });
    const state = createState();
    const mutation = await executeBuilderRuntimeOperation<
      BuilderRuntimeMutation<MdxPasteResult>
    >({
      id: "instances.insertMdxText",
      state,
      input: {
        parentInstanceId: "block",
        source: "# Inserted",
        insertIndex: 1,
      },
      context: {
        createId: createId(),
        projectId: "project",
        returnStorageChanges: true,
        materializedContent: [root],
      },
    });

    const [write] = await prepareMdxContentStorageWrites({
      loadedRoots: [root],
      changes: mutation.storageChanges ?? [],
      authorizeAssetWrite: () => true,
    });
    const persisted = await parseMdxDocument({ source: write.source });

    expect(persisted.children).toMatchObject([
      { type: "template", name: "Missing" },
      { type: "element", tag: "p" },
      { type: "element", tag: "h1" },
    ]);
  });

  test("rejects raw MDX metadata that does not match the semantic insertion", async () => {
    const { root, mutation } = await paste({ source: "# Inserted" });
    const change = mutation.storageChanges?.[0];
    if (change?.mdxInsert === undefined) {
      throw new Error("Expected an MDX storage insertion");
    }

    await expect(
      prepareMdxContentStorageWrites({
        loadedRoots: [root],
        changes: [
          {
            ...change,
            mdxInsert: {
              ...change.mdxInsert,
              instanceIds: [],
              rootInstanceIds: [],
            },
          },
        ],
        authorizeAssetWrite: () => true,
      })
    ).rejects.toThrow("does not match its semantic insertion");
  });

  test("uses the same destination templates without file-backed storage", async () => {
    const { mutation } = await paste({
      source: `<ws.element ws:name="Hero Card" />`,
      loaded: false,
    });

    expect(mutation.storageChanges).toBeUndefined();
    expect(mutation.result.diagnostics).toEqual([]);
    expect(mutation.payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ namespace: "instances" }),
      ])
    );
    expect(mutation.result.rootInstanceIds).toHaveLength(1);

    const unresolved = await paste({
      source: `<ws.element ws:name="Other Project Card" />`,
      loaded: false,
    });
    expect(unresolved.mutation.result.diagnostics).toMatchObject([
      { code: "unresolved-template", templateName: "Other Project Card" },
    ]);
    expect(unresolved.mutation.noop).toBe(true);
  });
});
