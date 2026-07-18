import { describe, expect, test } from "vitest";
import {
  createCanonicalAssetFileEntry,
  normalizeAssetFileDocument,
} from "./canonical";
import { extractMarkdownFrontmatter } from "./markdown";
import {
  aggregateAssetFields,
  AssetFieldCatalogAccumulator,
  computeCanonicalAssetRevision,
  createAssetFieldCatalog,
  toBuilderAssetFieldCatalog,
} from "./field-catalog";

const createEntry = ({
  id,
  properties,
  folderId,
  excerpt,
}: {
  id: string;
  properties: Record<string, unknown>;
  folderId?: string;
  excerpt?: string;
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
      revision: `revision-${id}`,
      contentRef: `${id}.md`,
      properties,
      ...(excerpt === undefined ? {} : { excerpt }),
    },
  });

describe("aggregateAssetFields", () => {
  test("aggregates standard and dynamic fields by document and type", () => {
    const catalog = aggregateAssetFields([
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

  test("returns an empty catalog without inventing a project", () => {
    expect(aggregateAssetFields([])).toEqual({
      documentCount: 0,
      fields: [],
    });
  });

  test("rejects duplicate assets and mixed projects", () => {
    const entry = createEntry({ id: "one", properties: {} });
    expect(() => aggregateAssetFields([entry, entry])).toThrow(
      "duplicate asset"
    );
    expect(() =>
      aggregateAssetFields([
        entry,
        { ...createEntry({ id: "two", properties: {} }), projectId: "other" },
      ])
    ).toThrow("multiple projects");
  });
});

describe("AssetFieldCatalogAccumulator", () => {
  test("decrements old contributions when an asset changes or is deleted", () => {
    const accumulator = new AssetFieldCatalogAccumulator();
    accumulator.upsert(
      createEntry({
        id: "one",
        folderId: "blog",
        excerpt: "One",
        properties: { category: "news", draft: false },
      })
    );
    accumulator.upsert(
      createEntry({
        id: "two",
        properties: { category: "guide", featured: true },
      })
    );

    accumulator.upsert(
      createEntry({
        id: "one",
        properties: { category: 1, title: "Updated" },
      })
    );
    const updated = accumulator.snapshot();
    expect(updated.documentCount).toBe(2);
    const updatedPaths = new Set(updated.fields.map((field) => field.path));
    expect(updatedPaths.has("properties.draft")).toBe(false);
    expect(updatedPaths.has("folderId")).toBe(false);
    expect(updatedPaths.has("excerpt")).toBe(false);
    expect(updated.fields).toEqual(
      expect.arrayContaining([
        {
          path: "properties.category",
          occurrences: 2,
          types: [
            { type: "number", occurrences: 1 },
            { type: "string", occurrences: 1 },
          ],
          optional: false,
          mixed: true,
        },
      ])
    );

    expect(accumulator.remove("two")).toBe(true);
    expect(accumulator.remove("missing")).toBe(false);
    const afterDelete = accumulator.snapshot();
    expect(afterDelete.documentCount).toBe(1);
    expect(
      afterDelete.fields.some((field) => field.path === "properties.featured")
    ).toBe(false);
    expect(afterDelete.fields).toEqual(
      expect.arrayContaining([
        {
          path: "properties.category",
          occurrences: 1,
          types: [{ type: "number", occurrences: 1 }],
          optional: false,
          mixed: false,
        },
      ])
    );
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

  test("does not retain mutable caller-owned entries", async () => {
    const entry = createEntry({ id: "one", properties: { title: "One" } });
    const accumulator = new AssetFieldCatalogAccumulator();
    accumulator.upsert(entry);
    const before = await accumulator.versionedSnapshot();

    entry.document.name = "mutated.md";
    entry.document.properties.title = "Mutated";

    await expect(accumulator.versionedSnapshot()).resolves.toEqual(before);
  });

  test("creates a compact Builder-only transport representation", async () => {
    const internal = await createAssetFieldCatalog([
      createEntry({
        id: "one",
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
