import { describe, expect, test } from "vitest";
import {
  collectionConfigFilename,
  createCollectionEntry,
  createDefaultCollectionConfig,
  getCollectionFieldValidationError,
  getCollectionTemplateValidationError,
  getCollectionValidationError,
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

  test("preserves schema keywords that are not managed by the configurator", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.summary = {
      type: "string",
      title: "Summary",
      description: "Shown in external schema tools",
      pattern: "^[A-Z]",
      "x-webstudio": {
        help: "Start with a capital letter",
      },
    };
    schema["x-webstudio"].customSetting = "keep";
    const config = parseCollectionConfig(JSON.stringify(schema));
    const fields = config.fields.map((field) =>
      field.key === "summary" ? { ...field, key: "excerpt" } : field
    );

    const serialized = JSON.parse(
      serializeCollectionConfig({ config, fields })
    );

    expect(serialized.properties.excerpt).toMatchObject({
      description: "Shown in external schema tools",
      pattern: "^[A-Z]",
      "x-webstudio": { help: "Start with a capital letter" },
    });
    expect(serialized["x-webstudio"].customSetting).toBe("keep");
  });

  test("does not overwrite schema properties unsupported by the configurator", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.metadata = {
      type: "object",
      properties: { author: { type: "string" } },
    };
    const config = parseCollectionConfig(JSON.stringify(schema));
    const fields = config.fields.map((field) =>
      field.key === "title" ? { ...field, key: "metadata" } : field
    );

    expect(() => serializeCollectionConfig({ config, fields })).toThrow(
      'Field key "metadata" is already used by a schema property that cannot be edited here'
    );
  });

  test("lets a new field take ownership of a previously unresolved required key", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.required.push("future");
    const config = parseCollectionConfig(JSON.stringify(schema));

    const serialized = JSON.parse(
      serializeCollectionConfig({
        config,
        fields: [
          ...config.fields,
          {
            key: "future",
            label: "Future",
            type: "string",
            control: "text",
            required: false,
          },
        ],
      })
    );

    expect(serialized.required).not.toContain("future");
  });

  test("rejects empty and duplicate editable field keys", () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    expect(() =>
      serializeCollectionConfig({
        config,
        fields: config.fields.map((field, index) =>
          index === 0 ? { ...field, key: "" } : field
        ),
      })
    ).toThrow("Every field needs a non-empty, unique key");
    expect(() =>
      serializeCollectionConfig({
        config,
        fields: config.fields.map((field) => ({ ...field, key: "same" })),
      })
    ).toThrow("Every field needs a non-empty, unique key");
    expect(() =>
      serializeCollectionConfig({
        config,
        fields: config.fields.map((field, index) =>
          index === 0 ? { ...field, label: " " } : field
        ),
      })
    ).toThrow("Every field needs a label");
  });

  test("uses the field key when a schema title is empty", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.title.title = "";

    const config = parseCollectionConfig(JSON.stringify(schema));

    expect(config.fields.find(({ key }) => key === "title")?.label).toBe(
      "title"
    );
  });

  test("rejects invalid field limits before serializing the schema", () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    const titleIndex = config.fields.findIndex(({ key }) => key === "title");
    const withTitle = (values: Partial<(typeof config.fields)[number]>) =>
      config.fields.map((field, index) =>
        index === titleIndex ? { ...field, ...values } : field
      );

    expect(() =>
      serializeCollectionConfig({
        config,
        fields: withTitle({ minLength: -1 }),
      })
    ).toThrow(
      "Title: Minimum length must be a whole number of zero or greater"
    );
    expect(() =>
      serializeCollectionConfig({
        config,
        fields: withTitle({ minLength: 5, maxLength: 4 }),
      })
    ).toThrow("Title: Minimum length cannot exceed maximum length");

    const numericFields = withTitle({
      type: "number",
      control: "number",
      minLength: undefined,
      maximum: 4,
      minimum: 5,
    });
    expect(() =>
      serializeCollectionConfig({ config, fields: numericFields })
    ).toThrow("Title: Minimum cannot exceed maximum");
  });

  test("removes the generated slug pattern when changing its control", () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    const fields = config.fields.map((field) =>
      field.key === "slug" ? { ...field, control: "text" as const } : field
    );

    const serialized = JSON.parse(
      serializeCollectionConfig({ config, fields })
    );

    expect(serialized.properties.slug.pattern).toBeUndefined();
    expect(serialized.properties.slug["x-webstudio"]).toBeUndefined();
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

  test("rejects a template with an invalid MDX body", async () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());

    await expect(
      createCollectionEntry({
        config,
        templateSource: "---\ndraft: true\n---\n\n<Broken",
        values: { title: "Broken template" },
        existingFilenames: [],
      })
    ).rejects.toThrow("Collection template is invalid");
  });

  test("reports schema failures and duplicate generated filenames", async () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());

    expect(
      getCollectionValidationError(config, {
        title: "",
        slug: "invalid slug",
        draft: true,
      })
    ).toBe("Title must contain at least 1 character");

    const extendedSchema = JSON.parse(createDefaultCollectionConfig());
    extendedSchema.required.push("metadata");
    extendedSchema.properties.metadata = { type: "object" };
    const extendedConfig = parseCollectionConfig(
      JSON.stringify(extendedSchema)
    );
    expect(
      getCollectionFieldValidationError(extendedConfig, {
        title: "Valid title",
        slug: "valid-title",
        draft: true,
      })
    ).toBeUndefined();
    expect(
      getCollectionValidationError(extendedConfig, {
        title: "Valid title",
        slug: "valid-title",
        draft: true,
      })
    ).toBeDefined();

    expect(
      getCollectionTemplateValidationError(config, { draft: true })
    ).toBeUndefined();
    expect(getCollectionTemplateValidationError(config, { draft: "yes" })).toBe(
      "Draft: Invalid input: expected boolean, received string"
    );
    expect(
      getCollectionTemplateValidationError(config, { unknown: true })
    ).toBeDefined();

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
