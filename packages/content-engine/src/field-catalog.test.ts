import { describe, expect, test } from "vitest";
import {
  createCanonicalAssetFileEntry,
  normalizeAssetFileDocument,
} from "./canonical";
import { extractMarkdownFrontmatter } from "./markdown";
import {
  computeCanonicalAssetRevision,
  createAssetFieldCatalog,
  toBuilderAssetFieldCatalog,
} from "./field-catalog";

const createEntry = ({
  id,
  properties,
  folderId,
  excerpt,
  createdAt,
}: {
  id: string;
  properties: Record<string, unknown>;
  folderId?: string;
  excerpt?: string;
  createdAt?: string;
}) =>
  createCanonicalAssetFileEntry({
    projectId: "project-1",
    document: {
      _id: id,
      _type: "asset.file",
      name: `${id}.md`,
      path: folderId === undefined ? `${id}.md` : `blog/${id}.md`,
      key: id,
      ...(folderId === undefined ? {} : { folderId }),
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      ...(createdAt === undefined ? {} : { createdAt }),
      revision: `revision-${id}`,
      contentRef: `${id}.md`,
      properties,
      ...(excerpt === undefined ? {} : { excerpt }),
    },
  });

describe("asset field aggregation", () => {
  test("aggregates standard and dynamic fields by document and type", async () => {
    const catalog = await createAssetFieldCatalog([
      createEntry({
        id: "one",
        folderId: "blog",
        excerpt: "One",
        properties: {
          title: "One",
          author: { name: "Ada" },
          tags: ["news", 1],
        },
      }),
      createEntry({
        id: "two",
        properties: { title: 2, draft: false },
      }),
    ]);

    expect(catalog).toMatchObject({
      projectId: "project-1",
      documentCount: 2,
    });
    expect(catalog.fields).toEqual(
      expect.arrayContaining([
        {
          path: "name",
          occurrences: 2,
          types: [{ type: "string", occurrences: 2 }],
          optional: false,
          mixed: false,
        },
        {
          path: "folderId",
          occurrences: 1,
          types: [{ type: "string", occurrences: 1 }],
          optional: true,
          mixed: false,
        },
        {
          path: "excerpt",
          occurrences: 1,
          types: [{ type: "string", occurrences: 1 }],
          optional: true,
          mixed: false,
        },
        {
          path: "properties.title",
          occurrences: 2,
          types: [
            { type: "number", occurrences: 1 },
            { type: "string", occurrences: 1 },
          ],
          optional: false,
          mixed: true,
        },
        {
          path: "properties.author.name",
          occurrences: 1,
          types: [{ type: "string", occurrences: 1 }],
          optional: true,
          mixed: false,
        },
        {
          path: "properties.tags[]",
          occurrences: 1,
          types: [
            { type: "number", occurrences: 1 },
            { type: "string", occurrences: 1 },
          ],
          optional: true,
          mixed: true,
        },
      ])
    );
    expect(catalog.fields.map((field) => field.path)).toEqual(
      [...catalog.fields.map((field) => field.path)].sort()
    );
  });

  test("returns an empty catalog without inventing a project", async () => {
    await expect(createAssetFieldCatalog([])).resolves.toMatchObject({
      documentCount: 0,
      fields: [],
    });
  });

  test("rejects duplicate assets and mixed projects", async () => {
    const entry = createEntry({ id: "one", properties: {} });
    await expect(createAssetFieldCatalog([entry, entry])).rejects.toThrow(
      "duplicate asset"
    );
    await expect(
      createAssetFieldCatalog([
        entry,
        { ...createEntry({ id: "two", properties: {} }), projectId: "other" },
      ])
    ).rejects.toThrow("multiple projects");
  });
});

describe("versioned asset field catalog", () => {
  test("is deterministic across entry and object-key order", async () => {
    const first = createEntry({
      id: "one",
      properties: { title: "One", author: { name: "Ada", active: true } },
    });
    const reordered = createEntry({
      id: "one",
      properties: { author: { active: true, name: "Ada" }, title: "One" },
    });
    const second = createEntry({ id: "two", properties: { title: "Two" } });

    expect(await computeCanonicalAssetRevision([first, second])).toBe(
      await computeCanonicalAssetRevision([second, reordered])
    );
  });

  test("discovers a newly indexed nested YAML field without configuration", async () => {
    const before = toBuilderAssetFieldCatalog(
      await createAssetFieldCatalog([
        createEntry({ id: "one", properties: { title: "One" } }),
      ])
    );
    expect(before.fields).not.toHaveProperty("properties.seo.social.title");

    const { properties } = await extractMarkdownFrontmatter(`---
title: Two
seo:
  social:
    title: Share this post
---
Body`);
    const indexed = createCanonicalAssetFileEntry({
      projectId: "project-1",
      document: normalizeAssetFileDocument({
        asset: {
          id: "two",
          name: "two.md",
          mimeType: "text/markdown",
          size: 100,
          revision: "revision-two",
          contentRef: "two.md",
        },
        properties,
      }),
    });
    const after = toBuilderAssetFieldCatalog(
      await createAssetFieldCatalog([
        createEntry({ id: "one", properties: { title: "One" } }),
        indexed,
      ])
    );

    expect(after.fields["properties.seo.social.title"]).toEqual({
      types: ["string"],
      occurrences: 1,
      optional: true,
      queryPath: ["properties", "seo", "social", "title"],
    });
  });

  test("changes when canonical content or standard metadata changes", async () => {
    const entry = createEntry({ id: "one", properties: { title: "One" } });
    const original = await computeCanonicalAssetRevision([entry]);
    const contentChanged = await computeCanonicalAssetRevision([
      {
        ...entry,
        revision: "revision-changed",
        document: { ...entry.document, revision: "revision-changed" },
      },
    ]);
    const renamed = await computeCanonicalAssetRevision([
      {
        ...entry,
        document: {
          ...entry.document,
          name: "renamed.md",
          path: "renamed.md",
        },
      },
    ]);

    expect(contentChanged).not.toBe(original);
    expect(renamed).not.toBe(original);
  });

  test("emits a versioned catalog envelope", async () => {
    const catalog = await createAssetFieldCatalog([
      createEntry({ id: "one", properties: { title: "One" } }),
    ]);
    expect(catalog).toMatchObject({
      format: "webstudio-asset-field-catalog",
      version: 1,
      projectId: "project-1",
      documentCount: 1,
    });
    expect(catalog.canonicalRevision).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test("creates a compact Builder-only transport representation", async () => {
    const internal = await createAssetFieldCatalog([
      createEntry({
        id: "one",
        createdAt: "2026-07-28T00:00:00.000Z",
        properties: { title: "One", category: "news" },
      }),
      createEntry({ id: "two", properties: { title: 2 } }),
    ]);
    const builderCatalog = toBuilderAssetFieldCatalog(internal);

    expect(builderCatalog).toMatchObject({
      format: "webstudio-builder-asset-field-catalog",
      version: 1,
      canonicalRevision: internal.canonicalRevision,
      documentCount: 2,
      fields: {
        name: { types: ["string"], occurrences: 2 },
        createdAt: {
          types: ["string"],
          occurrences: 1,
          optional: true,
          queryPath: ["createdAt"],
        },
        "properties.category": {
          types: ["string"],
          occurrences: 1,
          optional: true,
        },
        "properties.title": {
          types: ["number", "string"],
          occurrences: 2,
          mixed: true,
        },
      },
    });
    expect(builderCatalog).not.toHaveProperty("projectId");
    expect(JSON.stringify(builderCatalog).length).toBeLessThan(
      JSON.stringify(internal).length
    );
  });
});
