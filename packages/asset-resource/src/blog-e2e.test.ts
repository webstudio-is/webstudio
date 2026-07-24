import { describe, expect, test, vi } from "vitest";
import { createAssetResourceIndex } from "./resource-index";
import { createPublishedAssetResourceFetch } from "./published-runtime";

const assetRevision = `sha256:${"a".repeat(64)}`;
const documents = [
  {
    _id: "post-1",
    _type: "asset.file" as const,
    name: "hello.md",
    path: "blog/hello.md",
    key: "hello",
    extension: "md",
    mimeType: "text/markdown",
    size: 7,
    revision: "post-1-revision",
    contentRef: "hello.md",
    properties: {
      title: "Hello",
      slug: "hello",
      publishedAt: "2026-07-18",
      draft: false,
    },
    excerpt: "Excerpt",
  },
];

describe("published Markdown blog end-to-end", () => {
  test("lists metadata without bodies, then SSR-selects and hydrates one post by slug", async () => {
    const listingQuery = `{
      assets(
        where: { properties: { draft: { ne: true } } }
        orderBy: [{ field: PROPERTIES_publishedAt, direction: DESC }]
        first: 20
      ) {
        items { excerpt properties { title slug } }
      }
    }`;
    const detailQuery = `query Post($slug: String!) {
      assets(
        where: { properties: { slug: { eq: $slug } } }
        first: 1
      ) {
        items {
          id
          properties { title }
          content(mode: FULL) { text }
        }
      }
    }`;
    const listingIndex = await createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "listing",
      query: listingQuery,
      assetRevision,
      documents,
    });
    const detailIndex = await createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "detail",
      query: detailQuery,
      assetRevision,
      documents,
    });
    const indexes = new Map([
      ["/indexes/listing.json", listingIndex],
      ["/indexes/detail.json", detailIndex],
    ]);
    const fetchAsset = vi.fn(async (path: string) => {
      const index = indexes.get(path);
      if (index !== undefined) {
        return Response.json(index);
      }
      if (path === "/assets/hello.md") {
        return new Response("# Hello");
      }
      return new Response(null, { status: 404 });
    });
    const manifest = [
      [listingIndex, "/indexes/listing.json"],
      [detailIndex, "/indexes/detail.json"],
    ].map(([index, indexPath]) => {
      const typedIndex = index as typeof listingIndex;
      return {
        resourceId: typedIndex.resourceId,
        revision: typedIndex.integrity.checksum,
        queryHash: typedIndex.queryHash,
        assetRevision: typedIndex.assetRevision,
        indexPath: indexPath as string,
      };
    });
    const runtimeFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://blog.example",
      deploymentId: "blog-deployment",
      manifest,
      fetchAsset,
    });
    const request = (body: unknown) =>
      runtimeFetch(
        new Request("https://blog.example/$resources/assets/query", {
          method: "POST",
          body: JSON.stringify(body),
        })
      );

    const listing = await request({
      query: listingQuery,
      variables: {},
    });
    expect(await listing?.json()).toMatchObject({
      ok: true,
      data: {
        assets: {
          items: [
            {
              excerpt: "Excerpt",
              properties: { title: "Hello", slug: "hello" },
            },
          ],
        },
      },
    });
    expect(
      fetchAsset.mock.calls.filter(([path]) => path === "/assets/hello.md")
    ).toHaveLength(0);

    const detail = await request({
      query: detailQuery,
      variables: { slug: "hello" },
    });
    expect(await detail?.json()).toMatchObject({
      ok: true,
      data: {
        assets: {
          items: [
            {
              id: "post-1",
              properties: { title: "Hello" },
              content: { text: "# Hello" },
            },
          ],
        },
      },
    });
    expect(
      fetchAsset.mock.calls.filter(([path]) => path === "/assets/hello.md")
    ).toHaveLength(1);
  });
});
