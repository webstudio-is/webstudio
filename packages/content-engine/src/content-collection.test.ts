import { describe, expect, test } from "vitest";
import {
  collectionConfigFilename,
  collectionEntryFieldClearValue,
  createCollectionEntry,
  createDefaultCollectionConfig,
  getCollectionFieldValidationError,
  getCollectionFieldValidationIssue,
  getCollectionTemplateValidationError,
  getCollectionValidationError,
  parseCollectionConfig,
  normalizeCollectionSlug,
  serializeCollectionConfig,
  inspectContentCollection,
} from "./content-collection";

type MutableCollectionSchema = Record<string, unknown> & {
  properties: Record<string, Record<string, unknown>>;
};

describe("content collections", () => {
  test("resolves the bundled slug reference and applies sibling constraints", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.slug = {
      $ref: "https://webstudio.is/schemas/slug",
      title: "URL slug",
      minLength: 2,
      maxLength: 3,
      "x-webstudio": { control: "slug" },
    };
    const config = parseCollectionConfig(JSON.stringify(schema));
    expect(config.fields.find(({ key }) => key === "slug")).toMatchObject({
      type: "string",
      control: "slug",
      minLength: 2,
      maxLength: 3,
    });
    for (const slug of ["你好", "abc"]) {
      expect(config.validate({ title: "Title", slug }).success).toBe(true);
    }
    for (const slug of ["a", "abcd", "A-b", "a/b", 12]) {
      expect(config.validate({ title: "Title", slug }).success).toBe(false);
    }
    const saved = JSON.parse(
      serializeCollectionConfig({ config, fields: config.fields })
    );
    expect(saved.properties.slug.$ref).toBe(
      "https://webstudio.is/schemas/slug"
    );
    expect(saved.properties.slug).not.toHaveProperty("pattern");
  });

  test.each([
    "https://example.com/slug",
    "#/properties/slug",
    "https://webstudio.is/schemas/slug#unknown",
  ])("rejects an unknown schema reference %s", ($ref) => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.slug.$ref = $ref;
    expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow();
  });

  test("validation preserves additional frontmatter without filling defaults or coercing types", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.additionalProperties = true;
    schema.properties.title.default = "Default title";
    const config = parseCollectionConfig(JSON.stringify(schema));
    const value = { slug: "hello", extra: { nested: true } };
    expect(config.validate(value).success).toBe(false);
    expect(value).toEqual({ slug: "hello", extra: { nested: true } });
    const valid = { ...value, title: "Title" };
    expect(config.validate(valid).success).toBe(true);
    expect(valid.extra).toEqual({ nested: true });
    expect(config.validate({ ...valid, draft: "false" }).success).toBe(false);
  });
  test("maps missing and invalid values to exact field keys without losing template errors", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    const key = 'author/name~"';
    schema.properties[key] = { type: "string", minLength: 2 };
    schema.required.push(key);
    const config = parseCollectionConfig(JSON.stringify(schema));
    const base = { title: "Title", slug: "hello" };
    expect(getCollectionFieldValidationIssue(config, base)?.fieldKey).toBe(key);
    expect(
      getCollectionFieldValidationIssue(config, { ...base, [key]: "a" })
        ?.fieldKey
    ).toBe(key);
    expect(getCollectionTemplateValidationError(config, {})).toBeUndefined();
    expect(
      getCollectionTemplateValidationError(config, { [key]: "a" })
    ).toBeDefined();
    expect(
      getCollectionTemplateValidationError(config, { extra: true })
    ).toBeDefined();
  });

  test("keeps independent validators and counts Unicode code points at both length boundaries", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.title.minLength = 1;
    schema.properties.title.maxLength = 1;
    const short = parseCollectionConfig(JSON.stringify(schema));
    schema.properties.title.minLength = 2;
    schema.properties.title.maxLength = 2;
    const long = parseCollectionConfig(JSON.stringify(schema));
    for (let repeat = 0; repeat < 2; repeat += 1) {
      expect(short.validate({ title: "😀", slug: "a" }).success).toBe(true);
      expect(short.validate({ title: "😀😀", slug: "a" }).success).toBe(false);
      expect(long.validate({ title: "😀", slug: "a" }).success).toBe(false);
      expect(long.validate({ title: "😀😀", slug: "a" }).success).toBe(true);
    }
  });

  test("matches current-folder filenames with URLPattern and preserves patterns in settings", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema["x-webstudio"].entries = [
      "post-*.mdx",
      "!post-private-*.mdx",
      "статья*.mdx",
    ];
    const config = parseCollectionConfig(JSON.stringify(schema));
    const updated = parseCollectionConfig(
      serializeCollectionConfig({ config, fields: config.fields })
    );
    expect(updated.entries).toEqual(schema["x-webstudio"].entries);
    for (const filename of [
      "post-one.mdx",
      "POST-TWO.MDX",
      "post-with spaces.mdx",
      "post-#?%.mdx",
      "статья.mdx",
    ]) {
      expect(updated.matchesEntry(filename)).toBe(true);
    }
    for (const filename of [
      "post-private-one.mdx",
      "post-one.md",
      "other.mdx",
      "nested/post-one.mdx",
      "collection.json",
      "template.mdx",
    ]) {
      expect(updated.matchesEntry(filename)).toBe(false);
    }
    delete schema["x-webstudio"].entries;
    const legacy = parseCollectionConfig(JSON.stringify(schema));
    expect(legacy.entries).toEqual(["*.mdx"]);
    expect(legacy.matchesEntry("other.mdx")).toBe(true);
    expect(legacy.matchesEntry("other.md")).toBe(false);
  });

  test.each(
    [
      [],
      [""],
      ["!"],
      ["!*.mdx"],
      ["nested/*.mdx"],
      ["[".repeat(257)],
      ["("],
      Array(65).fill("*.mdx"),
    ].map((entries) => [entries])
  )("rejects invalid entry pattern configuration %j", (entries) => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema["x-webstudio"].entries = entries;
    expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow();
  });

  test("validates only selected entries and never reads ignored files", async () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema["x-webstudio"].entries = ["post-*.mdx"];
    const sources = new Map([
      ["collection.json", JSON.stringify(schema)],
      ["template.mdx", "---\ndraft: true\n---\nBody"],
      ["post-one.mdx", "---\ntitle: One\nslug: post-one\n---\nBody"],
    ]);
    const files = [
      ...sources.keys(),
      "notes.md",
      "cover.png",
      "ignored.mdx",
    ].map((filename) => ({
      file: filename,
      id: filename,
      filename,
      basename: filename.slice(0, filename.lastIndexOf(".")),
      isMdx: filename.endsWith(".mdx"),
    }));
    const result = await inspectContentCollection({
      files,
      readSource: async ({ filename }) => {
        const source = sources.get(filename);
        if (source === undefined) {
          throw new Error(`Unexpected read: ${filename}`);
        }
        return source;
      },
    });
    expect(result.entryFiles.map(({ filename }) => filename)).toEqual([
      "post-one.mdx",
    ]);
    await expect(
      createCollectionEntry({
        config: result.config,
        templateSource: sources.get("template.mdx")!,
        values: { title: "Other", slug: "other" },
        existingFilenames: [],
      })
    ).rejects.toThrow("does not match");
    const entry = await createCollectionEntry({
      config: result.config,
      templateSource: sources.get("template.mdx")!,
      values: { title: "Two", slug: "post-two" },
      existingFilenames: [],
    });
    expect(entry.filename).toBe("post-two.mdx");
  });
  test.each([
    ["фывафыва", "фывафыва"],
    ["Привет мир", "привет-мир"],
    ["你好世界", "你好世界"],
    ["日本語 の記事", "日本語-の記事"],
    ["हिन्दी लेख", "हिन्दी-लेख"],
    ["مرحبا بالعالم", "مرحبا-بالعالم"],
    ["Hello 世界 Привет", "hello-世界-привет"],
    ["Cafe\u0301", "café"],
    ["İstanbul", "i\u0307stanbul"],
    ["Hello / World?#%\\test", "hello-world-test"],
    ["\u0301Hello 🚀", "hello"],
  ])("creates a Unicode slug and filename for %s", async (title, slug) => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    expect(normalizeCollectionSlug(title)).toBe(slug);
    expect(normalizeCollectionSlug(slug)).toBe(slug);
    const entry = await createCollectionEntry({
      config,
      templateSource: "Body",
      values: { title },
      existingFilenames: [],
    });
    expect(entry.filename).toBe(`${slug}.mdx`);
    expect(entry.frontmatter.slug).toBe(slug);
    expect(config.validate(entry.frontmatter).success).toBe(true);
  });

  test.each(["🚀🎉", "///", "\u0301"])(
    "requires a manual slug when %s has no letters or numbers",
    async (title) => {
      const config = parseCollectionConfig(createDefaultCollectionConfig());
      expect(normalizeCollectionSlug(title)).toBe("");
      await expect(
        createCollectionEntry({
          config,
          templateSource: "Body",
          values: { title },
          existingFilenames: [],
        })
      ).rejects.toThrow();
      const entry = await createCollectionEntry({
        config,
        templateSource: "Body",
        values: { title, slug: "my-entry" },
        existingFilenames: [],
      });
      expect(entry.filename).toBe("my-entry.mdx");
    }
  );

  test.each([
    "Привет",
    "hello/world",
    "你好?",
    "a\nb",
    "hello\n",
    "-hello",
    "hello--world",
    "\u0301hello",
    "🚀",
  ])("rejects invalid slug %s", (slug) => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());
    expect(config.validate({ title: "Title", slug }).success).toBe(false);
  });

  test.each([
    "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    "^(?!.*[\\p{Lu}\\p{Lt}])[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*(?:-[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*)*$(?![\\s\\S])",
  ])(
    "upgrades generated slug rules to the bundled reference (%s)",
    (pattern) => {
      const schema = JSON.parse(createDefaultCollectionConfig());
      delete schema.properties.slug.$ref;
      schema.properties.slug.pattern = pattern;
      const legacy = parseCollectionConfig(JSON.stringify(schema));
      expect(legacy.validate({ title: "Title", slug: "hello" }).success).toBe(
        true
      );
      expect(legacy.validate({ title: "Title", slug: "你好" }).success).toBe(
        true
      );
      const serialized = serializeCollectionConfig({
        config: legacy,
        fields: legacy.fields,
      });
      const saved = JSON.parse(serialized);
      expect(saved.properties.slug.$ref).toBe(
        "https://webstudio.is/schemas/slug"
      );
      expect(saved.properties.slug).not.toHaveProperty("pattern");
      const updated = parseCollectionConfig(serialized);
      expect(
        serializeCollectionConfig({ config: updated, fields: updated.fields })
      ).toBe(serialized);
      expect(updated.validate({ title: "Title", slug: "你好" }).success).toBe(
        true
      );
    }
  );

  test.each([undefined, "Café Déjà"])(
    "generates slugs compatible with a legacy collection (manual: %s)",
    async (slug) => {
      const schema = JSON.parse(createDefaultCollectionConfig());
      delete schema.properties.slug.$ref;
      schema.properties.slug.pattern = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
      const config = parseCollectionConfig(JSON.stringify(schema));
      const entry = await createCollectionEntry({
        config,
        templateSource: "Body",
        values: { title: "Café Déjà", ...(slug === undefined ? {} : { slug }) },
        existingFilenames: [],
      });
      expect(entry.filename).toBe("café-déjà.mdx");
      expect(config.validate(entry.frontmatter).success).toBe(true);
    }
  );

  test("rejects canonically equivalent existing filenames", async () => {
    await expect(
      createCollectionEntry({
        config: parseCollectionConfig(createDefaultCollectionConfig()),
        templateSource: "Body",
        values: { title: "Café" },
        existingFilenames: ["cafe\u0301.mdx"],
      })
    ).rejects.toThrow();
  });
  test("retries slugless entries with a stable request ID", async () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    delete schema.properties.slug;
    schema.required = ["title"];
    delete schema["x-webstudio"].slugField;
    delete schema["x-webstudio"].generateSlugFrom;
    const config = parseCollectionConfig(JSON.stringify(schema));
    const request = {
      config,
      templateSource: "Body",
      values: { title: "Entry" },
      existingFilenames: [],
      requestId: "91f1de15-e03b-40ae-9b2f-6c19a8bbf1fa",
    };
    const first = await createCollectionEntry(request);
    const retry = await createCollectionEntry(request);
    expect(retry).toEqual(first);
    expect(first.filename).toBe(`entry-${request.requestId}.mdx`);
  });

  test("creates entries without slug fields and keeps generated filenames out of frontmatter", async () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    delete schema["x-webstudio"].slugField;
    delete schema["x-webstudio"].generateSlugFrom;
    delete schema.properties.slug;
    schema.required = schema.required.filter((key: string) => key !== "slug");
    const config = parseCollectionConfig(JSON.stringify(schema));
    const first = await createCollectionEntry({
      config,
      templateSource: "---\ndraft: true\n---\nBody",
      values: { title: "A title" },
      existingFilenames: [],
    });
    const second = await createCollectionEntry({
      config,
      templateSource: "---\ndraft: true\n---\nBody",
      values: { title: "A title" },
      existingFilenames: [first.filename],
    });
    expect(first.filename.endsWith(".mdx")).toBe(true);
    expect(second.filename).not.toBe(first.filename);
    expect(first.frontmatter).toEqual({ title: "A title", draft: true });
  });

  test("allows a manually entered slug without a generation source", async () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    delete schema["x-webstudio"].generateSlugFrom;
    const config = parseCollectionConfig(JSON.stringify(schema));
    const entry = await createCollectionEntry({
      config,
      templateSource: "",
      values: { title: "A title", slug: "manual-slug" },
      existingFilenames: [],
    });
    expect(entry.filename).toBe("manual-slug.mdx");
  });
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

  test("ignores and removes the obsolete dynamic preview setting", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema["x-webstudio"].previewPage = "blog-post";
    const config = parseCollectionConfig(JSON.stringify(schema));

    expect(config).not.toHaveProperty("previewPage");
    expect(
      JSON.parse(serializeCollectionConfig({ config, fields: config.fields }))[
        "x-webstudio"
      ]
    ).not.toHaveProperty("previewPage");
  });

  test("requires a separate field for automatic slug generation", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema["x-webstudio"].generateSlugFrom = "slug";

    expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow(
      "Slug source field must be different from the slug field"
    );
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
          "type must be string, number, integer, or boolean at #/properties/tags/type",
      },
      {
        update: (schema: MutableCollectionSchema) => {
          schema.properties.title.pattern = ".*";
        },
        message:
          "Only Webstudio's slug schema reference is supported; custom patterns are not supported",
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

  test("rejects schema properties unsupported by the configurator", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.metadata = {
      type: "object",
      properties: { author: { type: "string" } },
    };
    expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow(
      "type must be string, number, integer, or boolean at #/properties/metadata/type"
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

  test("rejects invalid field limits through schema validation", () => {
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
    ).toThrow("minLength must be a whole number of zero or greater");
    expect(() =>
      serializeCollectionConfig({
        config,
        fields: withTitle({ minLength: 5, maxLength: 4 }),
      })
    ).toThrow("minLength cannot exceed maxLength");

    const numericFields = withTitle({
      type: "number",
      control: "number",
      minLength: undefined,
      maximum: 4,
      minimum: 5,
    });
    expect(() =>
      serializeCollectionConfig({ config, fields: numericFields })
    ).toThrow("minimum cannot exceed maximum");
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
    expect(serialized.properties.slug.$ref).toBe(
      "https://webstudio.is/schemas/slug"
    );
    expect(
      parseCollectionConfig(JSON.stringify(serialized)).validate({
        title: "Title",
        slug: "你好",
      }).success
    ).toBe(true);
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
        settings: { slugField: "title", generateSlugFrom: "slug" },
      })
    );
    const title = nextConfig.schema.properties as Record<
      string,
      Record<string, unknown>
    >;

    expect(nextConfig.slugField).toBe("title");
    expect(nextConfig.generateSlugFrom).toBe("slug");
    expect(title.title.$ref).toBe("https://webstudio.is/schemas/slug");
    expect(
      nextConfig.validate({ title: "привет", slug: "Text, not a slug!" })
        .success
    ).toBe(true);
    expect(title.title["x-webstudio"]).toMatchObject({ control: "slug" });
    expect(title.slug.$ref).toBeUndefined();
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
        },
      })
    );

    expect(nextConfig).toMatchObject({
      template: "entry.mdx",
      slugField: "permalink",
      generateSlugFrom: "headline",
    });

    const withTemplateOnly = parseCollectionConfig(
      serializeCollectionConfig({
        config: nextConfig,
        fields: nextConfig.fields,
        settings: { template: "post.mdx" },
      })
    );
    expect(withTemplateOnly.template).toBe("post.mdx");
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

  test("rejects entry values for unknown properties", async () => {
    const config = parseCollectionConfig(createDefaultCollectionConfig());

    await expect(
      createCollectionEntry({
        config,
        templateSource: "---\ndraft: true\n---\n",
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
    schema.properties.draft.default = true;
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

  test("preserves schema defaults as annotations when field rules change", () => {
    const schema = JSON.parse(createDefaultCollectionConfig());
    schema.properties.title.default = "An old title that is no longer valid";
    const config = parseCollectionConfig(JSON.stringify(schema));
    const title = config.fields.find(({ key }) => key === "title");
    if (title === undefined) {
      throw new Error("Expected title field");
    }

    const serialized = JSON.parse(
      serializeCollectionConfig({
        config,
        fields: config.fields.map((field) =>
          field.key === "title" ? { ...field, maxLength: 5 } : field
        ),
      })
    );

    expect(serialized.properties.title.default).toBe(
      "An old title that is no longer valid"
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

  test("rejects nested object and array fields", () => {
    for (const field of [
      { type: "object", properties: { author: { type: "string" } } },
      { type: "array", items: { type: "string" } },
    ]) {
      const schema = JSON.parse(createDefaultCollectionConfig());
      schema.properties.advanced = field;
      expect(() => parseCollectionConfig(JSON.stringify(schema))).toThrow(
        "type must be string, number, integer, or boolean at #/properties/advanced/type"
      );
    }
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

    expect(
      getCollectionTemplateValidationError(config, { draft: true })
    ).toBeUndefined();
    expect(getCollectionTemplateValidationError(config, { draft: "yes" })).toBe(
      "Draft: must be boolean"
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
    delete missingControl.properties.slug.$ref;
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
