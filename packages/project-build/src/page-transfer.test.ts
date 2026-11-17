import { expect, test, vi } from "vitest";
import { createDefaultPages } from "./index";
import {
  executePageTransfer,
  planPageTransfer,
  projectPageCopyAssets,
  type PageTransferData,
} from "./transfer";
import type { Asset, WebstudioFragment } from "@webstudio-is/sdk";

const image: Asset = {
  id: "source-image",
  projectId: "source",
  type: "image",
  name: "hero_storage.png",
  filename: "hero",
  size: 32,
  format: "png",
  createdAt: "2026-11-17T00:00:00.000Z",
  description: null,
  meta: { width: 10, height: 10 },
};
const fragment: WebstudioFragment = {
  children: [],
  instances: [],
  assets: [],
  dataSources: [],
  resources: [],
  props: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
};
const page = createDefaultPages({
  homePageId: "page",
  rootInstanceId: "root",
}).pages.get("page")!;
const item: PageTransferData = {
  type: "page",
  page: { ...page, meta: { ...page.meta, socialImageAssetId: image.id } },
  rootFragment: fragment,
  bodyFragment: { ...fragment, assets: [image] },
};
const fixture = {
  item,
  sameStorage: true,
  sameProject: false,
  hasRenderedScope: false,
  source: { assets: [image], folders: [] },
  target: { assets: [], folders: [] },
  targetProjectId: "destination",
  readDocument: async () => {
    throw new Error("Unexpected document read");
  },
};

test("a same-storage copy stages an alias with no binary upload", async () => {
  const plan = await planPageTransfer(fixture);
  const upload = vi.fn(async () => {
    throw new Error("Unexpected upload");
  });
  const relink = vi.fn(async (plans: typeof plan.assets) =>
    plans.map(({ target }) => target)
  );
  const result = await executePageTransfer({
    plan,
    createFolder: async () => {
      throw new Error("Unexpected folder");
    },
    stageAssets: (plans) =>
      projectPageCopyAssets({ plans, sameStorage: true, relink, upload }),
    readTarget: async () => ({
      assets: plan.assets.map(({ target }) => target),
      folders: [],
    }),
    commit: async (item) => ({
      pageId: item.page.id,
      imageId: item.page.meta.socialImageAssetId,
    }),
  });
  expect(result).toEqual({ pageId: "page", imageId: image.id });
  expect(relink).toHaveBeenCalledOnce();
  expect(upload).not.toHaveBeenCalled();
  expect(plan.assets[0].target).toMatchObject({
    id: image.id,
    projectId: "destination",
    name: image.name,
  });
});

test("a change to the destination asset catalog prevents page insertion", async () => {
  const plan = await planPageTransfer(fixture);
  const commit = vi.fn(async () => ({ pageId: "should-not-commit" }));
  await expect(
    executePageTransfer({
      plan,
      createFolder: async () => {
        throw new Error("Unexpected folder");
      },
      stageAssets: async (plans) =>
        new Map(plans.map(({ source, target }) => [source.id, target])),
      readTarget: async () => ({
        assets: [{ ...plan.assets[0].target, name: "changed.png" }],
        folders: [],
      }),
      commit,
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_STALE" });
  expect(commit).not.toHaveBeenCalled();
});

test("same-storage copying rejects an Asset ID collision that requires changing a JSON document", async () => {
  const document: Asset = {
    ...image,
    id: "document",
    name: "content_storage.json",
    filename: "content",
    type: "file",
    format: "json",
    meta: {},
  };
  const unrelated: Asset = {
    ...image,
    projectId: "destination",
    name: "other_storage.png",
    filename: "other",
  };
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: { ...fragment, assets: [document] } },
      source: { assets: [image, document], folders: [] },
      target: { assets: [unrelated], folders: [] },
      readDocument: async () => JSON.stringify({ image: image.id }),
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_ASSET_CONFLICT" });
});

test("a normalized folder collision cannot silently change the canonical path", async () => {
  const folder = {
    id: "source-folder",
    projectId: "source",
    name: "Images",
    createdAt: image.createdAt,
  };
  const nested = { ...image, folderId: folder.id };
  await expect(
    planPageTransfer({
      ...fixture,
      item: { ...item, bodyFragment: { ...fragment, assets: [nested] } },
      source: { assets: [nested], folders: [folder] },
      target: {
        assets: [],
        folders: [
          {
            ...folder,
            id: "target-folder",
            projectId: "destination",
            name: "images",
          },
        ],
      },
    })
  ).rejects.toMatchObject({ code: "PAGE_COPY_ASSET_CONFLICT" });
});
