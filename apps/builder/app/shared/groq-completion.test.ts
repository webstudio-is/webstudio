import { describe, expect, test } from "vitest";
import { CompletionContext } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { groq } from "@sanity/lezer-groq";
import { createGroqCompletionSource } from "./groq-completion";

const complete = async (
  source: ReturnType<typeof createGroqCompletionSource>,
  doc: string
) => {
  const state = EditorState.create({ doc, extensions: [groq()] });
  return await source(new CompletionContext(state, doc.length, true));
};

describe("GROQ completion", () => {
  test("suggests language vocabulary and standard asset fields", async () => {
    const result = await complete(createGroqCompletionSource(), "*[");
    const labels = result?.options.map(({ label }) => label);
    expect(labels).toContain("extension");
    expect(labels).toContain("defined()");
    expect(labels).toContain("match");
  });

  test("suggests only configured parameters after a dollar sign", async () => {
    const result = await complete(
      createGroqCompletionSource({ parameterNames: ["slug", "locale"] }),
      "*[properties.slug == $"
    );
    expect(result?.options.map(({ label }) => label)).toEqual([
      "$slug",
      "$locale",
    ]);
  });

  test("suggests schema-less frontmatter fields from the project catalog", async () => {
    const result = await complete(
      createGroqCompletionSource({
        catalog: {
          format: "webstudio-builder-asset-field-catalog",
          version: 1,
          canonicalRevision: `sha256:${"a".repeat(64)}`,
          documentCount: 2,
          fields: {
            "properties.title": {
              types: ["string"],
              occurrences: 2,
            },
          },
        },
      }),
      "*[properties.t"
    );
    expect(result?.options).toContainEqual(
      expect.objectContaining({
        label: "properties.title",
        detail: "string",
      })
    );
  });

  test("keeps complete nested property paths available", async () => {
    const result = await complete(
      createGroqCompletionSource({
        catalog: {
          format: "webstudio-builder-asset-field-catalog",
          version: 1,
          canonicalRevision: `sha256:${"b".repeat(64)}`,
          documentCount: 3,
          fields: {
            "properties.author.name": {
              types: ["string"],
              occurrences: 2,
              optional: true,
            },
          },
        },
      }),
      "*[properties.author."
    );
    expect(result?.options).toContainEqual(
      expect.objectContaining({ label: "properties.author.name" })
    );
  });

  test("displays observed types, optionality, and mixed-type warnings", async () => {
    const result = await complete(
      createGroqCompletionSource({
        catalog: {
          format: "webstudio-builder-asset-field-catalog",
          version: 1,
          canonicalRevision: `sha256:${"c".repeat(64)}`,
          documentCount: 10,
          fields: {
            "properties.rating": {
              types: ["number", "string"],
              occurrences: 6,
              optional: true,
              mixed: true,
            },
          },
        },
      }),
      "*[properties.r"
    );
    expect(result?.options).toContainEqual(
      expect.objectContaining({
        label: "properties.rating",
        detail: "number | string · optional · mixed types",
        info: "6 observed documents",
      })
    );
  });

  test("uses the syntax tree to avoid suggestions inside strings", async () => {
    const source = createGroqCompletionSource();
    await expect(complete(source, '*[name == "partial')).resolves.toBeNull();

    const filterResult = await complete(source, "*[name == ");
    expect(filterResult?.options.map(({ label }) => label)).toContain("match");
    const dottedResult = await complete(source, "*[properties.");
    expect(dottedResult?.options.map(({ label }) => label)).not.toContain(
      "match"
    );
  });

  test("prioritizes fields referenced by an active resource query", async () => {
    const result = await complete(
      createGroqCompletionSource({
        resourceFieldPaths: new Set(["properties.slug"]),
        catalog: {
          format: "webstudio-builder-asset-field-catalog",
          version: 1,
          canonicalRevision: `sha256:${"d".repeat(64)}`,
          documentCount: 2,
          fields: {
            "properties.slug": { types: ["string"], occurrences: 2 },
            "properties.title": { types: ["string"], occurrences: 2 },
          },
        },
      }),
      "*[properties."
    );
    const slug = result?.options.find(
      ({ label }) => label === "properties.slug"
    );
    const title = result?.options.find(
      ({ label }) => label === "properties.title"
    );
    expect(slug?.boost).toBeGreaterThan(title?.boost ?? 0);
  });

  test("replaces suggestions when the catalog revision changes", async () => {
    const catalog = {
      format: "webstudio-builder-asset-field-catalog" as const,
      version: 1 as const,
      documentCount: 1,
    };
    const previous = await complete(
      createGroqCompletionSource({
        catalog: {
          ...catalog,
          canonicalRevision: `sha256:${"e".repeat(64)}`,
          fields: {
            "properties.oldField": { types: ["string"], occurrences: 1 },
          },
        },
      }),
      "*[properties."
    );
    const next = await complete(
      createGroqCompletionSource({
        catalog: {
          ...catalog,
          canonicalRevision: `sha256:${"f".repeat(64)}`,
          fields: {
            "properties.newField": { types: ["string"], occurrences: 1 },
          },
        },
      }),
      "*[properties."
    );
    expect(previous?.options.map(({ label }) => label)).toContain(
      "properties.oldField"
    );
    expect(next?.options.map(({ label }) => label)).toContain(
      "properties.newField"
    );
    expect(next?.options.map(({ label }) => label)).not.toContain(
      "properties.oldField"
    );
  });

  test.each([
    ["filter", "*[properties.ta"],
    ["projection", "*[]{properties.ta"],
    ["ordering", "*[] | order(properties.ta"],
    ["invalid partial query", "*[properties."],
  ])("completes fields in %s context", async (_context, doc) => {
    const result = await complete(
      createGroqCompletionSource({
        catalog: {
          format: "webstudio-builder-asset-field-catalog",
          version: 1,
          canonicalRevision: `sha256:${"1".repeat(64)}`,
          documentCount: 2,
          fields: {
            "properties.tags": { types: ["array"], occurrences: 2 },
          },
        },
      }),
      doc
    );
    expect(result?.options).toContainEqual(
      expect.objectContaining({
        label: "properties.tags",
        detail: "array",
      })
    );
  });
});
