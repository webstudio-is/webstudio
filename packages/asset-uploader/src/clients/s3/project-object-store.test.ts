import type { SignatureV4 } from "@smithy/signature-v4";
import { ObjectProjectStore } from "@webstudio-is/project-store";
import { afterEach, describe, expect, test, vi } from "vitest";
import { S3ProjectObjectStore } from "./project-object-store";
import { createS3ProjectStore } from "./s3";

const bucketPath = "/bucket/";

const createFakeS3 = ({
  repeatContinuationToken = false,
}: { repeatContinuationToken?: boolean } = {}) => {
  let version = 0;
  const objects = new Map<string, { body: Uint8Array; etag: string }>();
  const fetch = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input.toString());
      const method = init?.method ?? "GET";
      const headers = new Headers(init?.headers);
      if (url.searchParams.get("list-type") === "2") {
        const prefix = url.searchParams.get("prefix") ?? "";
        const keys = [...objects.keys()]
          .filter((key) => key.startsWith(prefix))
          .sort();
        const offset = Number(
          url.searchParams.get("continuation-token") ?? "0"
        );
        const page = keys.slice(offset, offset + 2);
        const nextOffset = offset + page.length;
        const truncated = nextOffset < keys.length;
        return new Response(
          `<ListBucketResult><IsTruncated>${truncated}</IsTruncated>${page
            .map((key) => `<Contents><Key>${key}</Key></Contents>`)
            .join("")}${
            truncated
              ? `<NextContinuationToken>${repeatContinuationToken ? "0" : nextOffset}</NextContinuationToken>`
              : ""
          }</ListBucketResult>`,
          { status: 200 }
        );
      }
      const key = decodeURIComponent(url.pathname.slice(bucketPath.length));
      const existing = objects.get(key);
      if (method === "GET") {
        const range =
          headers.get("range")?.match(/^bytes=(\d+)-(\d+)$/) ?? undefined;
        const body =
          existing === undefined || range === undefined
            ? existing?.body
            : existing.body.slice(Number(range[1]), Number(range[2]) + 1);
        return existing === undefined
          ? new Response(null, { status: 404 })
          : new Response(Uint8Array.from(body!).buffer, {
              status: range === undefined ? 200 : 206,
              headers: { etag: existing.etag },
            });
      }
      if (method === "DELETE") {
        objects.delete(key);
        return new Response(null, { status: 204 });
      }
      if (headers.get("if-none-match") === "*" && existing !== undefined) {
        return new Response(null, { status: 412 });
      }
      if (
        headers.has("if-match") &&
        headers.get("if-match") !== existing?.etag
      ) {
        return new Response(null, { status: 412 });
      }
      const body = new Uint8Array(await new Response(init?.body).arrayBuffer());
      const etag = `"${++version}"`;
      objects.set(key, { body, etag });
      return new Response(null, { status: 200, headers: { etag } });
    }
  );
  return { fetch, objects };
};

const createSigner = () =>
  ({ sign: async (request: unknown) => request }) as unknown as SignatureV4;

afterEach(() => vi.unstubAllGlobals());

describe("S3-compatible project object store", () => {
  test("rejects a repeated pagination token instead of looping", async () => {
    const fake = createFakeS3({ repeatContinuationToken: true });
    vi.stubGlobal("fetch", fake.fetch);
    const objects = new S3ProjectObjectStore({
      signer: createSigner(),
      endpoint: "https://storage.example",
      bucket: "bucket",
      prefix: "projects/project/db",
    });
    for (const key of ["a", "b", "c"]) {
      await objects.put(`objects/${key}`, new TextEncoder().encode(key));
    }

    await expect(objects.list("objects")).rejects.toThrow("repeated");
  });

  test("round-trips separate project data and assets", async () => {
    const fake = createFakeS3();
    vi.stubGlobal("fetch", fake.fetch);
    const store = createS3ProjectStore(
      {
        endpoint: "https://storage.example",
        region: "auto",
        accessKeyId: "access",
        secretAccessKey: "secret",
        bucket: "bucket",
      },
      "project/.."
    );

    const snapshot = await store.writeSnapshot({
      projectId: "project/..",
      builderRevision: "1",
      assetRevision: "1",
      collections: { "builder/pages": { homePageId: "home" } },
    });
    const asset = await store.writeAsset(new TextEncoder().encode("asset"));
    const repeatedAsset = await store.writeAsset(
      new TextEncoder().encode("asset")
    );

    await expect(store.readSnapshot(snapshot)).resolves.toMatchObject({
      collections: { "builder/pages": { homePageId: "home" } },
    });
    await expect(store.readAsset(asset)).resolves.toEqual(
      new TextEncoder().encode("asset")
    );
    await expect(
      store.readAsset(asset, { offset: 1, length: 3 })
    ).resolves.toEqual(new TextEncoder().encode("sse"));
    expect(repeatedAsset).toEqual(asset);
    expect([...fake.objects.keys()]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^projects\/project%2F%2E%2E\/db\/objects\//),
        expect.stringMatching(/^projects\/project%2F%2E%2E\/assets\/sha256\//),
      ])
    );
    const requestHeaders = new Headers(fake.fetch.mock.calls[0]?.[1]?.headers);
    expect(requestHeaders.get("authorization")).toMatch(
      /SignedHeaders=[^,]*host/
    );
    expect(requestHeaders.has("host")).toBe(false);
  });

  test("uses conditional S3 writes for concurrent project head updates", async () => {
    const fake = createFakeS3();
    vi.stubGlobal("fetch", fake.fetch);
    const objects = new S3ProjectObjectStore({
      signer: createSigner(),
      endpoint: "https://storage.example",
      bucket: "bucket",
      prefix: "projects/project/db",
    });
    const store = new ObjectProjectStore({
      projectId: "project",
      objects,
      assets: objects,
      heads: objects,
    });
    const snapshots = await Promise.all(
      [1, 2, 3].map((revision) =>
        store.writeSnapshot({
          projectId: "project",
          builderRevision: String(revision),
          assetRevision: "1",
          collections: {},
        })
      )
    );
    const created = await store.updateHead({
      name: "development",
      reference: snapshots[0],
    });
    if (created.status !== "updated") {
      throw new Error("Expected initial S3 project head update to succeed");
    }

    const results = await Promise.all([
      store.updateHead({
        name: "development",
        expectedRevision: created.head.revision,
        reference: snapshots[1],
      }),
      store.updateHead({
        name: "development",
        expectedRevision: created.head.revision,
        reference: snapshots[2],
      }),
    ]);

    expect(results.filter(({ status }) => status === "updated")).toHaveLength(
      1
    );
    expect(results.filter(({ status }) => status === "conflict")).toHaveLength(
      1
    );
    const headWrite = fake.fetch.mock.calls.find(
      ([input, init]) =>
        init?.method === "PUT" && input.toString().includes("/heads/")
    );
    expect(new Headers(headWrite?.[1]?.headers).get("cache-control")).toBe(
      "private, no-store"
    );
  });

  test("lists every S3 page without leaking sibling prefixes", async () => {
    const fake = createFakeS3();
    vi.stubGlobal("fetch", fake.fetch);
    const objects = new S3ProjectObjectStore({
      signer: createSigner(),
      endpoint: "https://storage.example",
      bucket: "bucket",
      prefix: "projects/project/db",
    });
    for (const key of ["a", "b", "c", "d", "e"]) {
      await objects.put(`objects/${key}`, new TextEncoder().encode(key));
    }
    await objects.put("objects-other/sibling", new Uint8Array());
    fake.objects.set("projects/project/database/sibling", {
      body: new Uint8Array(),
      etag: '"sibling"',
    });

    await expect(objects.list("objects")).resolves.toEqual([
      "objects/a",
      "objects/b",
      "objects/c",
      "objects/d",
      "objects/e",
    ]);
    expect(
      fake.fetch.mock.calls.filter(([input]) =>
        input.toString().includes("list-type=2")
      )
    ).toHaveLength(3);
    expect(
      (await objects.list("")).some((key) => key.includes("sibling"))
    ).toBe(false);
  });
});
