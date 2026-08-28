import { expect, test, vi } from "vitest";
import {
  blockBodyComponent,
  blockComponent,
  blockTemplateComponent,
  type Asset,
  type AssetFolder,
} from "@webstudio-is/sdk";
import {
  includeMdxAssetDependencies,
  prepareConnectedContentBlockFragment,
  resolveRepeatedContentBlockSourcesForCopy,
} from "./content-block-fragment";

const createFile = ({
  id,
  name,
  format,
  folderId,
}: {
  id: string;
  name: string;
  format: string;
  folderId?: string;
}) =>
  ({
    id,
    projectId: "project",
    name,
    type: "file",
    format,
    folderId,
    size: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    meta: {},
  }) satisfies Asset;

const source = createFile({
  id: "article",
  name: "article.mdx",
  format: "mdx",
  folderId: "articles",
});
const dependency = createFile({
  id: "hero",
  name: "hero.png",
  format: "png",
  folderId: "media",
});
const folders = new Map<string, AssetFolder>([
  [
    "articles",
    {
      id: "articles",
      projectId: "project",
      name: "articles",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  [
    "media",
    {
      id: "media",
      projectId: "project",
      name: "media",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
]);
const fragment = {
  children: [],
  instances: [],
  props: [],
  assets: [source],
  dataSources: [],
  resources: [],
  breakpoints: [],
  styleSources: [],
  styleSourceSelections: [],
  styles: [],
};

test("discovers dependencies for an unmounted MDX source", async () => {
  const readSource = vi.fn(async () => "![Hero](../media/hero.png)");
  const discoveryCache = new Map<
    string,
    Promise<readonly string[] | undefined>
  >();

  const result = await includeMdxAssetDependencies({
    fragment,
    projectId: "project",
    assets: new Map([
      [source.id, source],
      [dependency.id, dependency],
    ]),
    assetFolders: folders,
    discoveryCache,
    readSource,
  });
  await includeMdxAssetDependencies({
    fragment,
    projectId: "project",
    assets: new Map([
      [source.id, source],
      [dependency.id, dependency],
    ]),
    assetFolders: folders,
    discoveryCache,
    readSource,
  });

  expect(readSource).toHaveBeenCalledOnce();
  expect(readSource).toHaveBeenCalledWith(source.id);
  expect(result.fragment.assets).toEqual([source, dependency]);
  expect(result.skippedAssetIds).toEqual([]);
});

test("preserves an invalid MDX source and reports skipped discovery", async () => {
  const result = await includeMdxAssetDependencies({
    fragment,
    projectId: "project",
    assets: new Map([[source.id, source]]),
    assetFolders: folders,
    readSource: async () => "<broken",
  });

  expect(result.fragment.assets).toEqual([source]);
  expect(result.skippedAssetIds).toEqual([source.id]);
});

test("discovers transitive dependencies through Markdown documents", async () => {
  const author = createFile({
    id: "author",
    name: "author.md",
    format: "md",
    folderId: "articles",
  });

  const result = await includeMdxAssetDependencies({
    fragment,
    projectId: "project",
    assets: new Map([
      [source.id, source],
      [author.id, author],
      [dependency.id, dependency],
    ]),
    assetFolders: folders,
    readSource: async (assetId) =>
      assetId === source.id
        ? "---\nauthor:\n  $ref: ./author.md#frontmatter\n---\n"
        : "---\navatar: ../media/hero.png\n---\n",
  });

  expect(result.fragment.assets).toEqual([source, author, dependency]);
  expect(result.skippedAssetIds).toEqual([]);
});

test("discovers transitive dependencies through JSON documents", async () => {
  const author = createFile({
    id: "author",
    name: "author.json",
    format: "json",
    folderId: "articles",
  });

  const result = await includeMdxAssetDependencies({
    fragment,
    projectId: "project",
    assets: new Map([
      [source.id, source],
      [author.id, author],
      [dependency.id, dependency],
    ]),
    assetFolders: folders,
    readSource: async (assetId) =>
      assetId === source.id
        ? "---\nauthor:\n  $ref: ./author.json#\n---\n"
        : '{"avatar":"../media/hero.png"}',
  });

  expect(result.fragment.assets).toEqual([source, author, dependency]);
  expect(result.skippedAssetIds).toEqual([]);
});

test("includes a static expression source without a mounted Content Block", () => {
  const prepared = prepareConnectedContentBlockFragment({
    fragment: {
      ...fragment,
      children: [{ type: "id", value: "block" }],
      instances: [
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [
            { type: "id", value: "templates" },
            { type: "id", value: "authored" },
          ],
        },
        {
          type: "instance",
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
        {
          type: "instance",
          id: "authored",
          component: "Paragraph",
          children: [{ type: "text", value: "Loaded" }],
        },
      ],
      props: [
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "expression",
          value: JSON.stringify(source.id),
        },
      ],
      assets: [],
    },
    projectId: undefined,
    assets: new Map([[source.id, source]]),
  });

  expect(prepared.assets).toEqual([source]);
  expect(prepared.instances).not.toContainEqual(
    expect.objectContaining({ id: "authored" })
  );
});

test("preserves the designed shell and clears only an explicit Body", () => {
  const prepared = prepareConnectedContentBlockFragment({
    fragment: {
      ...fragment,
      children: [{ type: "id", value: "block" }],
      instances: [
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [
            { type: "id", value: "shell" },
            { type: "id", value: "templates" },
          ],
        },
        {
          type: "instance",
          id: "shell",
          component: "Box",
          children: [{ type: "id", value: "content" }],
        },
        {
          type: "instance",
          id: "content",
          component: blockBodyComponent,
          children: [{ type: "id", value: "authored" }],
        },
        {
          type: "instance",
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
        {
          type: "instance",
          id: "authored",
          component: "Paragraph",
          children: [{ type: "text", value: "Loaded" }],
        },
      ],
      props: [
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "asset",
          value: source.id,
        },
      ],
    },
    projectId: undefined,
  });

  expect(prepared.instances).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "block",
        children: [
          { type: "id", value: "shell" },
          { type: "id", value: "templates" },
        ],
      }),
      expect.objectContaining({ id: "shell" }),
      expect.objectContaining({ id: "content", children: [] }),
      expect.objectContaining({ id: "templates" }),
    ])
  );
  expect(prepared.instances).not.toContainEqual(
    expect.objectContaining({ id: "authored" })
  );
});

test("makes a copied Collection item source independent from its Collection", () => {
  const dynamicFragment = {
    ...fragment,
    children: [{ type: "id" as const, value: "item" }],
    instances: [
      {
        type: "instance" as const,
        id: "item",
        component: "Box",
        children: [{ type: "id" as const, value: "block" }],
      },
      {
        type: "instance" as const,
        id: "block",
        component: blockComponent,
        children: [],
      },
    ],
    props: [
      {
        id: "source",
        instanceId: "block",
        name: "src",
        type: "expression" as const,
        value: "$ws$dataSource$item.file",
      },
    ],
  };
  const firstScope = '["block","item","collection[first]","collection"]';
  const secondScope = '["block","item","collection[second]","collection"]';
  const result = resolveRepeatedContentBlockSourcesForCopy({
    fragment: dynamicFragment,
    selectedInstanceSelector: ["item", "collection[first]", "collection"],
    occurrences: [
      {
        sourceBlockInstanceId: "block",
        sourceRenderScope: firstScope,
        sourceInstanceSelector: JSON.parse(firstScope),
        assetId: "first-article",
      },
      {
        sourceBlockInstanceId: "block",
        sourceRenderScope: secondScope,
        sourceInstanceSelector: JSON.parse(secondScope),
        assetId: "second-article",
      },
    ],
  });

  expect(result.fragment.props).toEqual([
    expect.objectContaining({ type: "asset", value: "first-article" }),
  ]);
  expect(result.renderScopes).toEqual(new Set([firstScope]));
});

test("keeps a dynamic source when the copied item contains many occurrences", () => {
  const sourceProp = {
    id: "source",
    instanceId: "block",
    name: "src",
    type: "expression" as const,
    value: "$ws$dataSource$item.file",
  };
  const result = resolveRepeatedContentBlockSourcesForCopy({
    fragment: { ...fragment, props: [sourceProp] },
    selectedInstanceSelector: ["item", "collection[first]", "collection"],
    occurrences: ["nested[first]", "nested[second]"].map(
      (nestedInstanceId) => ({
        sourceBlockInstanceId: "block",
        sourceRenderScope: JSON.stringify([
          "block",
          nestedInstanceId,
          "item",
          "collection[first]",
          "collection",
        ]),
        sourceInstanceSelector: [
          "block",
          nestedInstanceId,
          "item",
          "collection[first]",
          "collection",
        ],
        assetId: nestedInstanceId,
      })
    ),
  });

  expect(result.fragment.props).toEqual([sourceProp]);
  expect(result.renderScopes).toHaveLength(2);
});
