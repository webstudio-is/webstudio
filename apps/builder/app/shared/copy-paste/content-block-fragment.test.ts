import { expect, test, vi } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  type Asset,
  type AssetFolder,
} from "@webstudio-is/sdk";
import {
  includeMdxAssetDependencies,
  prepareConnectedContentBlockFragment,
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
