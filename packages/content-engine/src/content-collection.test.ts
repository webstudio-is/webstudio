import { describe, expect, test } from "vitest";
import {
  collectionConfigFilename,
  createCollectionEntry,
  createDefaultCollectionConfig,
  parseCollectionConfig,
  serializeCollectionConfig,
} from "./content-collection";

describe("content collections", () => {
  test("uses collection.json as the folder entry point", () => {
    expect(collectionConfigFilename).toBe("collection.json");
    expect(
      parseCollectionConfig(createDefaultCollectionConfig())
    ).toMatchObject({
      template: "template.mdx",
      slugField: "slug",
      generateSlugFrom: "title",
    });
  });

  test("stores and clears the configured dynamic preview page", () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    const withPreview = parseCollectionConfig(
      serializeCollectionConfig({
        config,
        fields: config.fields,
        settings: { previewPage: "blog-post" },
      })
    );
    expect(withPreview.previewPage).toBe("blog-post");
    expect(
      parseCollectionConfig(
        serializeCollectionConfig({
          config: withPreview,
          fields: withPreview.fields,
          settings: {},
        })
      ).previewPage
    ).toBeUndefined();
  });

  test("creates an independent MDX entry from template defaults", async () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    const entry = await createCollectionEntry({
      config,
      templateSource: "---\ndraft: true\n---\n\nStart writing.\n",
      values: { title: "Designing With Constraints" },
      existingFilenames: ["another-post.mdx"],
    });

    expect(entry.filename).toBe("designing-with-constraints.mdx");
    expect(entry.frontmatter).toEqual({
      draft: true,
      slug: "designing-with-constraints",
      title: "Designing With Constraints",
    });
    expect(entry.source).toContain("Start writing.");
  });

  test("reports schema failures and duplicate generated filenames", async () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());

    await expect(
      createCollectionEntry({
        config,
        templateSource: "",
        values: { title: "" },
        existingFilenames: [],
      })
    ).rejects.toThrow("Title must contain at least 1 character");

    await expect(
      createCollectionEntry({
        config,
        templateSource: "",
        values: { title: "Hello world" },
        existingFilenames: ["hello-world.mdx"],
      })
    ).rejects.toThrow('An entry named "hello-world.mdx" already exists');
  });

  test("rejects collection references outside the folder", () => {
    const source = createDefaultCollectionConfig().replace(
      '"template": "template.mdx"',
      '"template": "../template.mdx"'
    );
    expect(() => parseCollectionConfig(source)).toThrow(
      "Template must be an MDX file in the collection folder"
    );
  });

  test("rejects invalid slug and slug-source field types", () => {
    const slugSchema = JSON.parse(createDefaultCollectionConfig());
    slugSchema.properties.slug.type = "boolean";
    expect(() => parseCollectionConfig(JSON.stringify(slugSchema))).toThrow(
      "Slug field must be a string"
    );

    const sourceSchema = JSON.parse(createDefaultCollectionConfig());
    sourceSchema.properties.title.type = "number";
    expect(() => parseCollectionConfig(JSON.stringify(sourceSchema))).toThrow(
      "Slug source field must be a string"
    );
  });
});
