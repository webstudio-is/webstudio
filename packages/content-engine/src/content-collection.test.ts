import { describe, expect, test } from "vitest";
import {
  collectionConfigFilename,
  collectionEntryFieldClearValue,
  createCollectionEntry,
  createDefaultCollectionConfig,
  getCollectionFieldValidationError,
  getCollectionTemplateValidationError,
  getCollectionValidationError,
  parseCollectionConfig,
  serializeCollectionConfig,
} from "./content-collection";

type MutableCollectionSchema = Record<string, unknown> & {
  properties: Record<string, Record<string, unknown>>;
};

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
          settings: { previewPage: undefined },
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
      "x-webstudio": { help: "Start with a capital letter" },
    });
    expect(serialized["x-webstudio"].customSetting).toBe("keep");
  });

  test("rejects JSON Schema semantics outside the supported subset", () => {
    const unsupportedSchemas = [
      {
        update: (schema: MutableCollectionSchema) => {
          schema.$schema = "https://json-schema.org/draft/2019-09/schema";
        },
        message: "Only JSON Schema draft 2020-12 is supported",
      },
      {
        update: (schema: MutableCollectionSchema) => {
          schema.minProperties = 1;
        },
        message:
          'Unsupported JSON Schema keyword "minProperties" at schema root',
      },
      {
        update: (schema: MutableCollectionSchema) => {
          schema.properties.title.enum = ["Only this title"];
        },
        message: 'Unsupported JSON Schema keyword "enum" at #/properties/title',
      },
      {
        update: (schema: MutableCollectionSchema) => {
          schema.properties.tags = {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
          };
        },
        message:
          'Unsupported JSON Schema keyword "uniqueItems" at #/properties/tags',
      },
      {
        update: (schema: MutableCollectionSchema) => {
          schema.properties.title.pattern = ".*";
        },
        message:
          "Only Webstudio's fixed slug pattern is supported at #/properties/title/pattern",
      },
    ];

    for (const { update, message } of unsupportedSchemas) {
      const schema = JSON.parse(createDefaultCollectionConfig());
      update(schema);
      expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow(
        message
      );
    }
  });

  test("rejects malformed supported JSON Schema keywords", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.title.minLength = -1;
    expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow(
      "minLength must be a whole number of zero or greater at #/properties/title/minLength"
    );

    schema.properties.title.minLength = 10;
    schema.properties.title.maxLength = 5;
    expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow(
      "minLength cannot exceed maxLength at #/properties/title"
    );
  });

  test("limits collection schema size, depth, fields, and strings", () => {
    const oversizedSource = `${createDefaultCollectionConfig()}${" ".repeat(
      1024 * 1024
    )}`;
    expect(() => parseCollectionConfig(oversizedSource)).toThrow(
      "collection.json exceeds the 1 MiB size limit"
    );

    const tooManyFields = JSON.parse(createDefaultCollectionConfig());
    for (let index = 0; index < 300; index += 1) {
      tooManyFields.properties[`field${index}`] = { type: "string" };
    }
    expect(() => parseCollectionConfig(JSON.stringify(tooManyFields))).toThrow(
      "collection.json exceeds the supported schema complexity"
    );

    const tooDeep = JSON.parse(createDefaultCollectionConfig());
    let nested: {
      type: string;
      properties: Record<string, unknown>;
    } = { type: "object", properties: {} };
    tooDeep.properties.metadata = nested;
    for (let depth = 0; depth < 10; depth += 1) {
      const child = { type: "object", properties: {} };
      nested.properties.child = child;
      nested = child;
    }
    expect(() => parseCollectionConfig(JSON.stringify(tooDeep))).toThrow(
      "collection.json exceeds the supported schema complexity"
    );

    const longString = JSON.parse(createDefaultCollectionConfig());
    longString.properties.title.description = "a".repeat(17 * 1024);
    expect(() => parseCollectionConfig(JSON.stringify(longString))).toThrow(
      "collection.json exceeds the supported schema complexity"
    );
  });

  test("blocks prototype-sensitive collection field keys", () => {
    const source = createDefaultCollectionConfig().replace(
      '"title": {',
      '"__proto__": { "type": "string" }, "title": {'
    );
    expect(() => parseCollectionConfig(source)).toThrow(
      'Property key "__proto__" is not supported'
    );

    const config = parseCollectionConfig(createDefaultCollectionConfig());
    expect(() =>
      serializeCollectionConfig({
        config,
        fields: config.fields.map((field, index) =>
          index === 0 ? { ...field, key: "constructor" } : field
        ),
      })
    ).toThrow('Property key "constructor" is not supported');
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

  test("rejects required keys that have no declared property", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.required.push("future");
    expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow(
      'Required property "future" is not defined in properties'
    );
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

  test("rejects duplicate original field ownership", () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    const fields = config.fields.map((field) =>
      field.key === "draft" ? { ...field, originalKey: "title" } : field
    );

    expect(() => serializeCollectionConfig({ config, fields })).toThrow(
      'Original field "title" cannot be edited more than once'
    );
  });

  test("uses the field key when a schema title is empty", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.title.title = "";

    const config = parseCollectionConfig(JSON.stringify(schema));

    expect(config.fields.find(({ key }) => key === "title")?.label).toBe(
      "title"
    );

    const serialized = JSON.parse(
      serializeCollectionConfig({ config, fields: config.fields })
    );
    expect(serialized.properties.title.title).toBe("");
  });

  test("does not add missing field annotations during a no-op save", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    delete schema.properties.draft.title;
    schema.properties.draft["x-webstudio"] = {};
    const config = parseCollectionConfig(JSON.stringify(schema));

    const serialized = JSON.parse(
      serializeCollectionConfig({ config, fields: config.fields })
    );

    expect(Object.hasOwn(serialized.properties.draft, "title")).toBe(false);
    expect(serialized.properties.draft["x-webstudio"]).toEqual({});
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

  test("preserves the configured slug field invariant", () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    const fields = config.fields.map((field) =>
      field.key === "slug"
        ? { ...field, control: "text" as const, required: false }
        : field
    );

    const serialized = JSON.parse(
      serializeCollectionConfig({ config, fields })
    );

    expect(serialized.required).toContain("slug");
    expect(serialized.properties.slug.pattern).toBe(
      "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    );
    expect(serialized.properties.slug["x-webstudio"]).toEqual({
      control: "slug",
    });
  });

  test("moves slug semantics when the configured slug field changes", () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());

    const nextConfig = parseCollectionConfig(
      serializeCollectionConfig({
        config,
        fields: config.fields,
        settings: { slugField: "title" },
      })
    );
    const title = nextConfig.schema.properties as Record<
      string,
      Record<string, unknown>
    >;

    expect(nextConfig.slugField).toBe("title");
    expect(title.title.pattern).toBe("^[a-z0-9]+(?:-[a-z0-9]+)*$");
    expect(title.title["x-webstudio"]).toMatchObject({ control: "slug" });
    expect(title.slug.pattern).toBeUndefined();
    expect(title.slug["x-webstudio"]).toBeUndefined();
    expect(
      nextConfig.fields.filter(({ control }) => control === "slug")
    ).toHaveLength(1);
  });

  test("preserves explicitly declared supported controls", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.title["x-webstudio"] = {
      control: "text",
      help: "Shown above the field",
    };
    schema.properties.draft["x-webstudio"] = { control: "checkbox" };
    const config = parseCollectionConfig(JSON.stringify(schema));

    const serialized = JSON.parse(
      serializeCollectionConfig({ config, fields: config.fields })
    );

    expect(serialized.properties.title["x-webstudio"]).toEqual({
      control: "text",
      help: "Shown above the field",
    });
    expect(serialized.properties.draft["x-webstudio"]).toEqual({
      control: "checkbox",
    });
  });

  test("rejects field controls the configurator cannot represent", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.title["x-webstudio"] = { control: "rich-text" };

    expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow(
      'Control "rich-text" is not supported for property "title"'
    );
  });

  test("serializes explicit collection setting changes", () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    const fields = config.fields.map((field) => {
      if (field.key === "title") {
        return { ...field, key: "headline" };
      }
      if (field.key === "slug") {
        return { ...field, key: "permalink" };
      }
      return field;
    });

    const nextConfig = parseCollectionConfig(
      serializeCollectionConfig({
        config,
        fields,
        settings: {
          template: "entry.mdx",
          slugField: "permalink",
          generateSlugFrom: "headline",
          previewPage: "post",
        },
      })
    );

    expect(nextConfig).toMatchObject({
      template: "entry.mdx",
      slugField: "permalink",
      generateSlugFrom: "headline",
      previewPage: "post",
    });

    const withTemplateOnly = parseCollectionConfig(
      serializeCollectionConfig({
        config: nextConfig,
        fields: nextConfig.fields,
        settings: { template: "post.mdx" },
      })
    );
    expect(withTemplateOnly.template).toBe("post.mdx");
    expect(withTemplateOnly.previewPage).toBe("post");
  });

  test("validates explicit collection setting changes while serializing", () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());

    expect(() =>
      serializeCollectionConfig({
        config,
        fields: config.fields,
        settings: { template: "../entry.mdx" },
      })
    ).toThrow("Template must be an MDX file in the collection folder");
    expect(() =>
      serializeCollectionConfig({
        config,
        fields: config.fields,
        settings: { slugField: "missing" },
      })
    ).toThrow("Slug field is not defined in properties");
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

  test("rejects entry values for unknown and template-only properties", async () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.metadata = {
      type: "object",
      properties: { author: { type: "string" } },
      additionalProperties: false,
    };
    const config = parseCollectionConfig(JSON.stringify(schema));

    await expect(
      createCollectionEntry({
        config,
        templateSource: "---\nmetadata:\n  author: Ada\n---\n",
        values: {
          title: "Protected metadata",
          metadata: { author: "Grace" },
        },
        existingFilenames: [],
      })
    ).rejects.toThrow(
      'Property "metadata" cannot be set when creating an entry'
    );
    await expect(
      createCollectionEntry({
        config,
        templateSource: "---\nmetadata:\n  author: Ada\n---\n",
        values: { title: "Unknown value", unknown: true },
        existingFilenames: [],
      })
    ).rejects.toThrow(
      'Property "unknown" cannot be set when creating an entry'
    );
  });

  test("clears optional editable properties inherited from the template", async () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    expect(
      getCollectionFieldValidationError(config, {
        title: "Published entry",
        slug: "published-entry",
        draft: collectionEntryFieldClearValue,
      })
    ).toBeUndefined();

    const entry = await createCollectionEntry({
      config,
      templateSource: "---\ndraft: true\n---\n",
      values: {
        title: "Published entry",
        draft: collectionEntryFieldClearValue,
      },
      existingFilenames: [],
    });

    expect(Object.hasOwn(entry.frontmatter, "draft")).toBe(false);
    expect(entry.source).not.toContain("draft:");
  });

  test("treats schema defaults as annotations instead of missing values", async () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.required.push("draft");
    const config = parseCollectionConfig(JSON.stringify(schema));
    const values = {
      title: "No draft value",
      slug: "no-draft-value",
    };

    expect(getCollectionValidationError(config, values)).toBeDefined();
    await expect(
      createCollectionEntry({
        config,
        templateSource: "",
        values: { title: "No draft value" },
        existingFilenames: [],
      })
    ).rejects.toThrow("Draft:");

    const entry = await createCollectionEntry({
      config,
      templateSource: "---\ndraft: true\n---\n",
      values: { title: "Has a draft value" },
      existingFilenames: [],
    });
    expect(entry.frontmatter.draft).toBe(true);
  });

  test("rejects editable field defaults that do not satisfy the field schema", () => {
    const wrongType = JSON.parse(createDefaultCollectionConfig());
    wrongType.properties.draft.default = "yes";
    expect(() => parseCollectionConfig(JSON.stringify(wrongType))).toThrow(
      'Default for property "draft" does not satisfy its schema'
    );

    const outsideLimits = JSON.parse(createDefaultCollectionConfig());
    outsideLimits.properties.title.default = "";
    expect(() => parseCollectionConfig(JSON.stringify(outsideLimits))).toThrow(
      'Default for property "title" does not satisfy its schema'
    );
  });

  test("uses JSON Schema character counts for string limits", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.title.minLength = 2;
    const config = parseCollectionConfig(JSON.stringify(schema));

    expect(
      getCollectionValidationError(config, {
        title: "😀",
        slug: "emoji",
        draft: true,
      })
    ).toBe("Title must contain at least 2 characters");
  });

  test("validates supported nested object and array schemas", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.required.push("metadata", "tags");
    schema.properties.metadata = {
      type: "object",
      required: ["author"],
      properties: { author: { type: "string", minLength: 1 } },
      additionalProperties: false,
    };
    schema.properties.tags = {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1,
      maxItems: 2,
    };
    const config = parseCollectionConfig(JSON.stringify(schema));

    expect(
      getCollectionValidationError(config, {
        title: "Nested values",
        slug: "nested-values",
        draft: true,
        metadata: { author: "Ada" },
        tags: ["schema"],
      })
    ).toBeUndefined();
    expect(
      getCollectionValidationError(config, {
        title: "Nested values",
        slug: "nested-values",
        draft: true,
        metadata: { author: "Ada", extra: true },
        tags: [],
      })
    ).toBeDefined();
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
      getCollectionTemplateValidationError(extendedConfig, { draft: true })
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

  test("checks ASCII filename collisions independently of locale", async () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    const localeLowerCase = String.prototype.toLocaleLowerCase;
    String.prototype.toLocaleLowerCase = function () {
      return localeLowerCase.call(this, "tr");
    };
    try {
      await expect(
        createCollectionEntry({
          config,
          templateSource: "",
          values: { title: "I" },
          existingFilenames: ["I.MDX"],
        })
      ).rejects.toThrow('An entry named "i.mdx" already exists');
    } finally {
      String.prototype.toLocaleLowerCase = localeLowerCase;
    }
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
    slugSchema.properties.slug = { title: "URL slug", type: "boolean" };
    expect(() => parseCollectionConfig(JSON.stringify(slugSchema))).toThrow(
      "Slug field must be a string"
    );

    const sourceSchema = JSON.parse(createDefaultCollectionConfig());
    sourceSchema.properties.title = { title: "Title", type: "number" };
    expect(() => parseCollectionConfig(JSON.stringify(sourceSchema))).toThrow(
      "Slug source field must be a string"
    );
  });

  test("requires the configured slug property", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.required = schema.required.filter(
      (key: string) => key !== schema["x-webstudio"].slugField
    );

    expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow(
      "Slug field must be required"
    );
  });

  test("requires exactly one canonical slug control", () => {
    const missingControl = JSON.parse(createDefaultCollectionConfig());
    delete missingControl.properties.slug.pattern;
    delete missingControl.properties.slug["x-webstudio"];
    expect(() => parseCollectionConfig(JSON.stringify(missingControl))).toThrow(
      "Slug field must use the slug control"
    );

    const extraControl = JSON.parse(createDefaultCollectionConfig());
    extraControl.properties.alias = {
      type: "string",
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      "x-webstudio": { control: "slug" },
    };
    expect(() => parseCollectionConfig(JSON.stringify(extraControl))).toThrow(
      'Only the configured slug field can use the slug control; found "alias"'
    );
  });
});
