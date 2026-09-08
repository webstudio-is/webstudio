import { expect, test, vi } from "vitest";
import {
  createDefaultCollectionConfig,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import type { ContentCollection } from "./content-collections";
import { checkCollectionEntries } from "./use-collection-entry-validation";

const asset = (id: string, folderId = "posts"): Asset => ({
  id,
  projectId: "project",
  name: `${id}.mdx`,
  filename: id,
  folderId,
  type: "file",
  format: "mdx",
  size: 30,
  meta: {},
  createdAt: "2026-09-08T00:00:00Z",
});
const collection: Extract<ContentCollection, { status: "ready" }> = {
  status: "ready",
  folderId: "posts",
  configAsset: asset("collection"),
  templateAsset: asset("template"),
  templateProperties: {},
  config: parseCollectionConfig(createDefaultCollectionConfig()),
};

test("checks only direct entries, reuses revisions and clears repaired field errors", async () => {
  const assets = [
    asset("post"),
    asset("template"),
    asset("nested", "child"),
    { ...asset("image"), name: "image.png" },
  ];
  const cache = new Map();
  const readFrontmatter = vi.fn(async () => ({ title: "", slug: "post" }));
  const input = {
    collection,
    assets,
    cache,
    readFrontmatter,
    cancelled: () => false,
  };
  const issues = await checkCollectionEntries(input);
  expect([...issues.keys()]).toEqual(["post"]);
  expect(issues.get("post")?.[0].fieldKey).toBe("title");
  expect(readFrontmatter).toHaveBeenCalledTimes(1);
  await checkCollectionEntries(input);
  expect(readFrontmatter).toHaveBeenCalledTimes(1);
  readFrontmatter.mockResolvedValue({ title: "Fixed", slug: "post" });
  expect(
    (
      await checkCollectionEntries({
        ...input,
        assets: [{ ...assets[0], name: "revision.mdx" }],
      })
    ).size
  ).toBe(0);
  expect(readFrontmatter).toHaveBeenCalledTimes(2);
  const schema = JSON.parse(createDefaultCollectionConfig());
  schema.properties.title.minLength = 20;
  const changed = {
    ...collection,
    config: parseCollectionConfig(JSON.stringify(schema)),
  };
  expect(
    (
      await checkCollectionEntries({
        ...input,
        collection: changed,
        assets: [{ ...assets[0], name: "revision.mdx" }],
      })
    ).get("post")?.[0].fieldKey
  ).toBe("title");
  expect(readFrontmatter).toHaveBeenCalledTimes(2);
});

test("keeps a read failure local to its entry and retries it", async () => {
  const readFrontmatter = vi.fn(async (file: Asset) => {
    if (file.id === "broken") {
      throw new Error("Network failed");
    }
    return { title: "Good", slug: file.id };
  });
  const input = {
    collection,
    assets: [asset("broken"), asset("good")],
    cache: new Map(),
    readFrontmatter,
    cancelled: () => false,
  };
  expect([...(await checkCollectionEntries(input)).keys()]).toEqual(["broken"]);
  readFrontmatter.mockImplementation(async (file) => ({
    title: "Fixed",
    slug: file.id,
  }));
  expect((await checkCollectionEntries(input)).size).toBe(0);
  expect(readFrontmatter).toHaveBeenCalledTimes(3);
});

test("stops scheduling after cancellation and discards late results", async () => {
  let finish: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let cancelled = false;
  const readFrontmatter = vi.fn(async () => {
    await pending;
    return {};
  });
  const cache = new Map();
  const result = checkCollectionEntries({
    collection,
    assets: Array.from({ length: 8 }, (_, id) => asset(String(id))),
    cache,
    readFrontmatter,
    cancelled: () => cancelled,
  });
  expect(readFrontmatter).toHaveBeenCalledTimes(4);
  cancelled = true;
  finish();
  expect((await result).size).toBe(0);
  expect(cache.size).toBe(0);
  expect(readFrontmatter).toHaveBeenCalledTimes(4);
});
