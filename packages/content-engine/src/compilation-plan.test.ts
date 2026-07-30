import { describe, expect, test, vi } from "vitest";
import {
  createContentCompilationPlan,
  hasDynamicContentCompilationValues,
  createContentFieldCatalogCompilationPlan,
  createLiteralContentCompilationQuery,
  isContentDocumentCandidate,
  prepareContentCompilerEntries,
  requiresHydratedContent,
  requiresRuntimeDocumentData,
  requiresStructuredProperties,
  selectContentHydrationCandidates,
} from "./compilation-plan";
import { assetQuery, type AssetFileDocument, type AssetQuery } from "./schema";
import { createCanonicalAssetFileEntry } from "./canonical";

test("field catalog plan requests properties without excerpts or bodies", () => {
  expect(createContentFieldCatalogCompilationPlan()).toMatchObject({
    structuredPropertyPaths: "all",
    excerpt: false,
    queries: [
      {
        where: { all: [] },
        content: { mode: "none" },
      },
    ],
  });
});

const query = assetQuery.parse({
  where: { all: [] },
  output: { mode: "base" as const, includeMetadata: true },
});

const compilationQuery = (id: string, value: AssetQuery = query) =>
  createLiteralContentCompilationQuery({
    id,
    query: value,
  });

const document: AssetFileDocument = {
  _id: "post",
  _type: "asset.file",
  name: "post.md",
  path: "blog/post.md",
  key: "post",
  extension: "md",
  mimeType: "text/markdown",
  size: 100,
  revision: "revision",
  contentRef: "post.md",
  properties: { draft: true },
};

describe("content compilation plan", () => {
  test("keeps base-only queries free of parser and hydration work", () => {
    const plan = createContentCompilationPlan([compilationQuery("base")]);
    expect(plan).toEqual({
      standardFields: [
        ["createdAt"],
        ["description"],
        ["extension"],
        ["folderId"],
        ["id"],
        ["key"],
        ["mimeType"],
        ["name"],
        ["path"],
        ["revision"],
        ["size"],
      ],
      structuredPropertyPaths: [],
      excerpt: false,
      metadataError: true,
      queries: [compilationQuery("base")],
    });
    expect(requiresStructuredProperties(plan!)).toBe(false);
    expect(requiresHydratedContent(plan!)).toBe(false);
    expect(requiresRuntimeDocumentData(plan!)).toBe(false);
  });

  test("derives structured, excerpt, and content requirements independently", () => {
    const plan = createContentCompilationPlan([
      compilationQuery("detail", {
        ...query,
        where: {
          any: [
            {
              field: ["properties", "slug"],
              operator: "eq" as const,
              value: "post",
            },
          ],
        },
        sort: [{ field: ["excerpt"], direction: "asc" as const }],
        content: { mode: "markdown-body" as const },
      }),
    ]);
    expect(plan).toMatchObject({ excerpt: true });
    expect(requiresStructuredProperties(plan!)).toBe(true);
    expect(requiresHydratedContent(plan!)).toBe(true);
  });

  test("detects runtime asset fields in filters, sorting, and output", () => {
    const runtimeQueries = [
      { where: { all: [{ field: ["width"], operator: "gte", value: 600 }] } },
      { sort: [{ field: ["height"], direction: "desc" }] },
      {
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["url"]],
        },
      },
    ].map((value) => assetQuery.parse({ ...query, ...value }));
    for (const value of runtimeQueries) {
      const plan = createContentCompilationPlan([
        compilationQuery("runtime", value),
      ]);
      expect(plan).toBeDefined();
      expect(requiresRuntimeDocumentData(plan!)).toBe(true);
    }
  });

  test("unions selected fields deterministically and returns no requirements for no queries", () => {
    expect(createContentCompilationPlan([])).toBeUndefined();
    expect(
      createContentCompilationPlan([
        compilationQuery("title", {
          ...query,
          output: {
            mode: "fields",
            includeMetadata: true,
            fields: [["properties", "title"]],
          },
        }),
        compilationQuery("excerpt", {
          ...query,
          output: {
            mode: "fields",
            includeMetadata: true,
            fields: [["excerpt"], ["properties", "slug"]],
          },
        }),
      ])
    ).toEqual({
      standardFields: [
        ["createdAt"],
        ["description"],
        ["extension"],
        ["folderId"],
        ["id"],
        ["key"],
        ["mimeType"],
        ["name"],
        ["path"],
        ["revision"],
        ["size"],
      ],
      structuredPropertyPaths: [
        ["properties", "slug"],
        ["properties", "title"],
      ],
      excerpt: true,
      metadataError: true,
      queries: expect.any(Array),
    });
  });

  test("treats all-fields output as the broadest requirement", () => {
    expect(
      createContentCompilationPlan([
        compilationQuery("base"),
        compilationQuery("all", {
          ...query,
          output: { mode: "all", includeMetadata: true },
        }),
      ])
    ).toMatchObject({
      structuredPropertyPaths: "all",
      excerpt: true,
    });
  });

  test("excludes files rejected by static filters without treating dynamic values as false", () => {
    const staticQuery = createLiteralContentCompilationQuery({
      id: "markdown",
      query: {
        ...query,
        where: {
          all: [
            { field: ["extension"], operator: "eq", value: "md" },
            {
              field: ["properties", "draft"],
              operator: "ne",
              value: true,
            },
          ],
        },
      },
    });
    const plan = createContentCompilationPlan([staticQuery]);
    expect(plan).toBeDefined();
    if (plan === undefined) {
      return;
    }

    expect(
      isContentDocumentCandidate({ document, plan, available: "base" })
    ).toBe(true);
    expect(
      isContentDocumentCandidate({ document, plan, available: "all" })
    ).toBe(false);
    expect(
      isContentDocumentCandidate({
        document: { ...document, extension: "json" },
        plan,
        available: "base",
      })
    ).toBe(false);

    const dynamicPlan = createContentCompilationPlan([
      {
        ...staticQuery,
        where: {
          field: ["properties", "slug"],
          operator: "eq",
          value: { type: "dynamic" },
        },
      },
    ]);
    expect(dynamicPlan).toBeDefined();
    if (dynamicPlan !== undefined) {
      expect(
        isContentDocumentCandidate({
          document,
          plan: dynamicPlan,
          available: "all",
        })
      ).toBe(true);
    }
  });

  test("hydrates only the statically selected window and keeps dynamic windows conservative", () => {
    const documents = ["alpha", "beta", "gamma"].map((id, index) => ({
      ...document,
      _id: id,
      name: `${id}.md`,
      path: `blog/${id}.md`,
      key: id,
      revision: `revision-${id}`,
      contentRef: `${id}.md`,
      properties: { order: index },
    }));
    const staticPlan = createContentCompilationPlan([
      compilationQuery("window", {
        ...query,
        sort: [{ field: ["properties", "order"], direction: "desc" }],
        offset: 1,
        limit: 1,
        content: { mode: "full" },
      }),
    ]);
    expect(staticPlan).toBeDefined();
    if (staticPlan === undefined) {
      return;
    }
    expect(
      selectContentHydrationCandidates({ documents, plan: staticPlan })
    ).toEqual(new Set(["beta"]));

    const dynamicPlan = {
      ...staticPlan,
      queries: staticPlan.queries.map((item) => ({
        ...item,
        limit: { type: "dynamic" as const },
      })),
    };
    expect(
      selectContentHydrationCandidates({ documents, plan: dynamicPlan })
    ).toEqual(new Set(["alpha", "beta", "gamma"]));

    const runtimePlan = createContentCompilationPlan([
      compilationQuery("runtime-window", {
        ...query,
        where: {
          all: [{ field: ["width"], operator: "gte", value: 600 }],
        },
        sort: [{ field: ["width"], direction: "desc" }],
        limit: 1,
        content: { mode: "full" },
      }),
    ]);
    expect(runtimePlan).toBeDefined();
    if (runtimePlan !== undefined) {
      expect(
        isContentDocumentCandidate({
          document,
          plan: runtimePlan,
          available: "all",
        })
      ).toBe(true);
      expect(
        selectContentHydrationCandidates({ documents, plan: runtimePlan })
      ).toEqual(new Set(["alpha", "beta", "gamma"]));
    }
  });

  test("reports dynamic filter and window values", () => {
    const plan = createContentCompilationPlan([
      {
        ...compilationQuery("dynamic"),
        where: {
          field: ["properties", "slug"],
          operator: "eq",
          value: { type: "dynamic" },
        },
      },
    ]);
    expect(plan).toBeDefined();
    if (plan === undefined) {
      return;
    }
    expect(hasDynamicContentCompilationValues(plan)).toBe(true);
    expect(
      hasDynamicContentCompilationValues({
        ...plan,
        queries: plan.queries.map((item) => ({
          ...item,
          where: { all: [] },
        })),
      })
    ).toBe(false);
    expect(
      hasDynamicContentCompilationValues({
        ...plan,
        queries: plan.queries.map((item) => ({
          ...item,
          where: { all: [] },
          offset: { type: "dynamic" },
        })),
      })
    ).toBe(true);
  });

  test("bounds content reads and marks unavailable required content", async () => {
    const plan = createContentCompilationPlan([
      compilationQuery("content", {
        ...query,
        content: { mode: "full" },
      }),
    ]);
    expect(plan).toBeDefined();
    if (plan === undefined) {
      return;
    }
    const entries = [
      { id: "newest", createdAt: "2026-07-30T00:00:00.000Z", ref: "shared" },
      { id: "shared", createdAt: "2026-07-29T00:00:00.000Z", ref: "shared" },
      { id: "omitted", createdAt: "2026-07-28T00:00:00.000Z", ref: "other" },
    ].map(({ id, createdAt, ref }) =>
      createCanonicalAssetFileEntry({
        projectId: "project",
        document: {
          ...document,
          _id: id,
          name: `${id}.md`,
          path: `blog/${id}.md`,
          key: id,
          size: 6,
          createdAt,
          revision: `revision-${id}`,
          contentRef: ref,
        },
      })
    );
    const loadContent = vi.fn(async () => "shared");

    const prepared = await prepareContentCompilerEntries({
      entries,
      plan,
      maximumContentBytes: 6,
      loadContent,
    });

    expect(loadContent).toHaveBeenCalledOnce();
    expect(prepared).toEqual([
      expect.objectContaining({
        assetId: "newest",
        content: "shared",
        contentRequired: true,
      }),
      expect.objectContaining({
        assetId: "shared",
        content: "shared",
        contentRequired: true,
      }),
      expect.objectContaining({
        assetId: "omitted",
        contentRequired: true,
      }),
    ]);
    expect(prepared[2]).not.toHaveProperty("content");
  });
});
