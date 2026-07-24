import { describe, expect, test } from "vitest";
import type { AssetFileDocument } from "@webstudio-is/sdk";
import { createCanonicalAssetFileEntry } from "./canonical";
import { computeCanonicalAssetRevision } from "./field-catalog";
import {
  buildAssetResourceIndex,
  computeAssetResourceQueryHash,
  createAssetResourceIndexBuilder,
  createAssetResourceIndex,
  normalizeAssetResourceIndex,
  serializeAssetResourceIndex,
  verifyAssetResourceIndex,
} from "./resource-index";

const createDocument = (
  id: string,
  properties: AssetFileDocument["properties"]
): AssetFileDocument => ({
  _id: id,
  _type: "asset.file",
  name: `${id}.md`,
  path: `${id}.md`,
  key: id,
  extension: "md",
  mimeType: "text/markdown",
  size: 100,
  revision: `revision-${id}`,
  contentRef: `${id}.md`,
  properties,
});

describe("resource index build", () => {
  test("validates a changed query before reading canonical build input", async () => {
    const entries = {
      [Symbol.iterator]: () => {
        throw new Error("Canonical entries were read");
      },
    } as unknown as readonly ReturnType<typeof createCanonicalAssetFileEntry>[];

    await expect(
      buildAssetResourceIndex({
        projectId: "project-1",
        resourceId: "resource-1",
        query: "query { assets(",
        entries,
      })
    ).rejects.toThrow("Syntax Error");
  });

  test("builds directly from canonical metadata with a compiled query plan", async () => {
    const entries = [
      createCanonicalAssetFileEntry({
        projectId: "project-1",
        document: createDocument("fr", {
          locale: "fr",
          slug: "bonjour",
        }),
      }),
      createCanonicalAssetFileEntry({
        projectId: "project-1",
        document: createDocument("en", { locale: "en", slug: "hello" }),
      }),
    ];
    const index = await buildAssetResourceIndex({
      projectId: "project-1",
      resourceId: "resource-1",
      query: `query Post($slug: String!) {
        assets(where: { properties: { locale: { eq: "en" }, slug: { eq: $slug } } }, first: 1) {
          items { id properties { locale slug } }
        }
      }`,
      entries,
    });

    expect(index).toMatchObject({
      assetRevision: await computeCanonicalAssetRevision(entries),
    });
    expect(index.documents.map(({ _id }) => _id)).toEqual(["en", "fr"]);
    expect(index.plan).toMatchObject({ kind: "asset-list" });
    await expect(verifyAssetResourceIndex(index)).resolves.toEqual(index);
  });

  test("accepts a canonical revision prepared from the same entries", async () => {
    const entry = createCanonicalAssetFileEntry({
      projectId: "project-1",
      document: createDocument("post", {}),
    });
    const assetRevision = await computeCanonicalAssetRevision([entry]);

    const index = await buildAssetResourceIndex({
      projectId: "project-1",
      resourceId: "resource-1",
      query: "{ assets { items { id } } }",
      entries: [entry],
      assetRevision,
    });

    expect(index.assetRevision).toBe(assetRevision);
  });

  test("reuses one prepared canonical snapshot across resource queries", async () => {
    const entries = [
      createCanonicalAssetFileEntry({
        projectId: "project-1",
        document: createDocument("one", { locale: "en" }),
      }),
      createCanonicalAssetFileEntry({
        projectId: "project-1",
        document: createDocument("two", { locale: "fr" }),
      }),
    ];
    const builder = await createAssetResourceIndexBuilder({
      projectId: "project-1",
      entries,
    });

    const [all, english] = await Promise.all([
      builder.build({
        resourceId: "all",
        query: "{ assets { items { id } } }",
      }),
      builder.build({
        resourceId: "english",
        query:
          '{ assets(where: { properties: { locale: { eq: "en" } } }) { items { id } } }',
      }),
    ]);

    expect(builder.projectId).toBe("project-1");
    expect(all.assetRevision).toBe(builder.assetRevision);
    expect(english.assetRevision).toBe(builder.assetRevision);
    expect(all.documents.map(({ _id }) => _id)).toEqual(["one", "two"]);
    expect(english.documents.map(({ _id }) => _id)).toEqual(["one", "two"]);
  });

  test("rejects an asset revision unrelated to the prepared entries", async () => {
    const entry = createCanonicalAssetFileEntry({
      projectId: "project-1",
      document: createDocument("post", {}),
    });
    await expect(
      buildAssetResourceIndex({
        projectId: "project-1",
        resourceId: "posts",
        query: "{ assets { items { id } } }",
        entries: [entry],
        assetRevision: `sha256:${"0".repeat(64)}`,
      })
    ).rejects.toThrow("do not match the supplied asset revision");
  });

  test("treats all frontmatter fields as schemaless query data", async () => {
    const entries = [
      createCanonicalAssetFileEntry({
        projectId: "project-1",
        document: createDocument("published", { draft: false }),
      }),
      createCanonicalAssetFileEntry({
        projectId: "project-1",
        document: createDocument("draft", { draft: true, secret: "draft" }),
      }),
      createCanonicalAssetFileEntry({
        projectId: "project-1",
        document: createDocument("private", {
          private: true,
          secret: "private",
        }),
      }),
    ];
    const index = await buildAssetResourceIndex({
      projectId: "project-1",
      resourceId: "resource-1",
      query: "{ assets { items { id } } }",
      entries,
    });

    expect(index.documents.map(({ _id }) => _id)).toEqual([
      "draft",
      "private",
      "published",
    ]);
    expect(serializeAssetResourceIndex(index)).toContain("secret");
  });

  test("rejects mixed projects, inconsistent identities, and duplicate assets", async () => {
    const entry = createCanonicalAssetFileEntry({
      projectId: "project-1",
      document: createDocument("one", {}),
    });
    await expect(
      buildAssetResourceIndex({
        projectId: "project-2",
        resourceId: "resource-1",
        query: "{ assets { items { id } } }",
        entries: [entry],
      })
    ).rejects.toThrow("multiple projects");
    await expect(
      buildAssetResourceIndex({
        projectId: "project-1",
        resourceId: "resource-1",
        query: "{ assets { items { id } } }",
        entries: [{ ...entry, assetId: "other" }],
      })
    ).rejects.toThrow("identity is inconsistent");
    await expect(
      buildAssetResourceIndex({
        projectId: "project-1",
        resourceId: "resource-1",
        query: "{ assets { items { id } } }",
        entries: [entry, entry],
      })
    ).rejects.toThrow("duplicate canonical assets");
  });
});

const base = {
  format: "webstudio-resource-index" as const,
  version: 1 as const,
  resourceId: "resource-1",
  queryHash: `sha256:${"a".repeat(64)}`,
  assetRevision: `sha256:${"b".repeat(64)}`,
  plan: {
    format: "webstudio-asset-query-plan",
    version: 1,
    kind: "asset-list",
    queryHash: `sha256:${"a".repeat(64)}`,
    assetRevision: `sha256:${"b".repeat(64)}`,
    rootResponseKey: "assets",
    variables: [
      {
        name: "locale",
        type: { kind: "named", name: "String", required: false },
      },
      {
        name: "slug",
        type: { kind: "named", name: "String", required: false },
      },
    ],
    orderBy: [],
    first: 100,
    skip: 0,
    fields: [{ kind: "items", responseKey: "items", fields: [] }],
  } as const,
  integrity: {
    algorithm: "sha256" as const,
    checksum: `sha256:${"c".repeat(64)}`,
  },
};

describe("resource index normalization and serialization", () => {
  test("sorts documents without mutating the input", () => {
    const documents = [
      createDocument("two", { title: "Two" }),
      createDocument("one", { title: "One" }),
    ];
    const index = normalizeAssetResourceIndex({
      ...base,
      documents,
    });

    expect(index.documents.map(({ _id }) => _id)).toEqual(["one", "two"]);
    expect(documents.map(({ _id }) => _id)).toEqual(["two", "one"]);
  });

  test("emits identical bytes for equivalent key and input order", () => {
    const first = normalizeAssetResourceIndex({
      ...base,
      documents: [
        createDocument("two", { title: "Two" }),
        createDocument("one", {
          title: "One",
          author: { name: "Ada", active: true },
        }),
      ],
    });
    const second = normalizeAssetResourceIndex({
      ...base,
      documents: [
        createDocument("one", {
          author: { active: true, name: "Ada" },
          title: "One",
        }),
        createDocument("two", { title: "Two" }),
      ],
    });

    expect(serializeAssetResourceIndex(first)).toBe(
      serializeAssetResourceIndex(second)
    );
  });

  test("rejects duplicate document identities", () => {
    expect(() =>
      normalizeAssetResourceIndex({
        ...base,
        documents: [
          createDocument("one", { title: "One" }),
          createDocument("one", { title: "Duplicate" }),
        ],
      })
    ).toThrow();
  });

  test("computes query, asset, content-reference, and integrity metadata", async () => {
    const documents = [createDocument("one", { title: "One", slug: "one" })];
    const query = `query Post($slug: String!) {
      assets(where: { properties: { slug: { eq: $slug } } }, first: 1) {
        items { id properties { title } }
      }
    }`;
    const index = await createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "resource-1",
      query,
      assetRevision: `sha256:${"b".repeat(64)}`,
      documents,
    });

    expect(index.queryHash).toBe(await computeAssetResourceQueryHash(query));
    expect(index.assetRevision).toBe(`sha256:${"b".repeat(64)}`);
    expect(index.documents[0].contentRef).toBe("one.md");
    expect(index.integrity).toMatchObject({
      algorithm: "sha256",
      checksum: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
    await expect(verifyAssetResourceIndex(index)).resolves.toEqual(index);
  });

  test("rejects tampered or schema-unknown artifact content", async () => {
    const index = await createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "resource-1",
      query: "{ assets { items { id } } }",
      assetRevision: `sha256:${"b".repeat(64)}`,
      documents: [createDocument("one", { title: "One" })],
    });
    await expect(
      verifyAssetResourceIndex({
        ...index,
        documents: [
          { ...index.documents[0], properties: { title: "Tampered" } },
        ],
      })
    ).rejects.toThrow("checksum is invalid");
    await expect(
      verifyAssetResourceIndex({ ...index, unexpected: true })
    ).rejects.toThrow();
    await expect(
      verifyAssetResourceIndex({
        ...index,
        documents: [{ ...index.documents[0], body: "secret" }],
      })
    ).rejects.toThrow();
  });
});
