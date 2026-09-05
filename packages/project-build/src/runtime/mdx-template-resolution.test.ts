import { describe, expect, test } from "vitest";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import { coreTemplates } from "@webstudio-is/sdk-components-registry/core-templates";
import { componentIds } from "@webstudio-is/sdk-components-registry/components";
import { renderTemplate } from "@webstudio-is/template";
import {
  blockComponent,
  blockTemplateComponent,
  contentBlockMdxTemplateDescriptors,
  elementComponent,
  getContentBlockMdxTemplateDescriptor,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type Instances,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { resolveMdxTemplates } from "./mdx-template-resolution";

const createInstance = (
  id: string,
  component: string,
  values: Partial<Pick<Instance, "children" | "label" | "tag">> = {}
): Instance => ({ type: "instance", id, component, children: [], ...values });

const identity: ContentBlockExternalContentIdentity = {
  blockInstanceId: "block",
  assetId: "article",
  revision: "revision-1",
  contentRef: "articles/hello.mdx",
  format: "mdx",
  renderScope: "route:/hello",
};

const metas: ReadonlyMap<string, WsComponentMeta> = new Map([
  ["Card", { label: "Card" }],
  ["Badge", { label: "Badge" }],
]);

const standardMdxSource = `# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

Paragraph with *emphasis*, **strong**, ~~strikethrough~~, \`inline code\`, and [a link](https://example.com).${"  "}
Next line.

> Blockquote

- [x] Task item
- List item

1. Ordered item

---

| Header | Value |
| --- | --- |
| Cell | Value |

![Alternative text](./image.png)

\`\`\`js
code()
\`\`\`
`;

const createInstances = (): Instances =>
  new Map([
    [
      "block",
      createInstance("block", blockComponent, {
        children: [{ type: "id", value: "templates" }],
      }),
    ],
    [
      "templates",
      createInstance("templates", blockTemplateComponent, {
        children: [
          { type: "id", value: "hero" },
          { type: "id", value: "card" },
        ],
      }),
    ],
    [
      "hero",
      createInstance("hero", elementComponent, {
        label: "Hero Card",
        tag: "section",
      }),
    ],
    [
      "card",
      createInstance("card", "Card", {
        children: [{ type: "id", value: "badge" }],
      }),
    ],
    ["badge", createInstance("badge", "Badge", { label: "Nested" })],
  ]);

describe("resolveMdxTemplates", () => {
  test("reaches every standard template through authored Markdown", async () => {
    const instances = createInstances();
    const templates = instances.get("templates");
    if (templates === undefined) {
      throw new Error("Expected Templates container");
    }
    templates.children = [];
    for (const descriptor of contentBlockMdxTemplateDescriptors) {
      const id = `template-${descriptor.resolutionKey}`;
      templates.children.push({ type: "id", value: id });
      instances.set(
        id,
        createInstance(
          id,
          descriptor.kind === "element"
            ? elementComponent
            : descriptor.component,
          descriptor.kind === "element" ? { tag: descriptor.tag } : {}
        )
      );
    }
    const document = await parseMdxDocument({ source: standardMdxSource });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      metas,
    });
    const resolvedTemplateIds = new Set(
      result.references.flatMap((reference) =>
        reference.type === "resolved-template"
          ? [reference.templateInstanceId]
          : []
      )
    );

    expect(result.diagnostics).toEqual([]);
    expect(
      contentBlockMdxTemplateDescriptors
        .map(({ resolutionKey }) => resolutionKey)
        .filter((key) => resolvedTemplateIds.has(`template-${key}`) === false)
    ).toEqual([]);
  });

  test("resolves authored Markdown through the actual core templates", async () => {
    const template = coreTemplates[blockComponent];
    if (template === undefined) {
      throw new Error("Expected the core Content Block template");
    }
    const fragment = renderTemplate(template.template, undefined, [], {
      componentIds,
    });
    const instances = new Map(
      fragment.instances.map((instance) => [instance.id, instance])
    );
    const block = fragment.instances.find(
      ({ component }) => component === blockComponent
    );
    const templates = fragment.instances.find(
      ({ component }) => component === blockTemplateComponent
    );
    if (block === undefined || templates === undefined) {
      throw new Error("Expected the core Content Block containers");
    }
    const expectedTemplateIds = new Set(
      templates.children.flatMap((child) => {
        const instance =
          child.type === "id" ? instances.get(child.value) : undefined;
        return instance !== undefined &&
          getContentBlockMdxTemplateDescriptor(instance) !== undefined
          ? [instance.id]
          : [];
      })
    );
    const document = await parseMdxDocument({ source: standardMdxSource });

    const result = resolveMdxTemplates({
      document,
      identity: { ...identity, blockInstanceId: block.id },
      instances,
      metas,
    });
    const resolvedTemplateIds = new Set(
      result.references.flatMap((reference) =>
        reference.type === "resolved-template"
          ? [reference.templateInstanceId]
          : []
      )
    );

    expect(result.diagnostics).toEqual([]);
    expect(
      Array.from(expectedTemplateIds).filter(
        (templateId) => resolvedTemplateIds.has(templateId) === false
      )
    ).toEqual([]);
    const codeTemplate = fragment.instances.find(
      ({ component }) => component === "CodeText"
    );
    expect(
      result.references.find(
        (reference) =>
          reference.type === "resolved-template" &&
          reference.templateInstanceId === codeTemplate?.id
      )?.templateName
    ).toBe("CodeText");

    const componentNameDocument = await parseMdxDocument({
      source: "<CodeText />\n",
    });
    expect(
      resolveMdxTemplates({
        document: componentNameDocument,
        identity: { ...identity, blockInstanceId: block.id },
        instances,
        metas,
      }).references
    ).toEqual([
      expect.objectContaining({
        type: "resolved-template",
        templateName: "CodeText",
        templateInstanceId: codeTemplate?.id,
      }),
    ]);

    for (const component of ["Image", "CodeText"]) {
      const templateInstance = fragment.instances.find(
        (instance) => instance.component === component
      );
      const templateName = templateInstance?.name ?? component;
      const legacyDocument = await parseMdxDocument({
        source: `<ws.element ws:name="${templateName}" />\n`,
      });
      expect(
        resolveMdxTemplates({
          document: legacyDocument,
          identity: { ...identity, blockInstanceId: block.id },
          instances,
          metas,
        }).references
      ).toEqual([
        expect.objectContaining({
          type: "resolved-template",
          templateName,
          templateInstanceId: templateInstance?.id,
        }),
      ]);
    }
  });

  test("resolves component-style JSX by its direct template name", async () => {
    const document = await parseMdxDocument({
      source: '<Card tone="quiet">Content</Card>',
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances: createInstances(),
      metas,
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "resolved-template",
        path: [0],
        templateName: "Card",
        templateInstanceId: "card",
      }),
    ]);
    expect(document.children[0]).toMatchObject({
      type: "template",
      syntax: "jsx",
      name: "Card",
    });
  });

  test("reads a legacy label alias and resolves it to the stable name", async () => {
    const instances = createInstances();
    const card = instances.get("card");
    if (card === undefined) {
      throw new Error("Expected card template");
    }
    card.name = "Card";
    card.label = "Promotion Card";
    const document = await parseMdxDocument({
      source: '<ws.element ws:name="Promotion Card" />\n',
    });

    expect(
      resolveMdxTemplates({ document, identity, instances, metas }).references
    ).toEqual([
      expect.objectContaining({
        type: "resolved-template",
        templateName: "Card",
        templateInstanceId: "card",
      }),
    ]);
  });

  test("lets a canonical name win over another template's legacy label alias", async () => {
    const instances = createInstances();
    const card = instances.get("card");
    const templates = instances.get("templates");
    if (card === undefined || templates === undefined) {
      throw new Error("Expected card and templates");
    }
    card.name = "Card";
    card.label = "PromotionCard";
    instances.set("promotion", {
      ...createInstance("promotion", "Badge"),
      name: "PromotionCard",
    });
    templates.children.push({ type: "id", value: "promotion" });

    const document = await parseMdxDocument({ source: "<PromotionCard />\n" });
    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      metas,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.references).toEqual([
      expect.objectContaining({
        type: "resolved-template",
        templateName: "PromotionCard",
        templateInstanceId: "promotion",
      }),
    ]);
  });

  test("lets a stable template name shadow the registered component fallback", async () => {
    const instances = createInstances();
    instances.set(
      "reserved-image-name",
      createInstance("reserved-image-name", elementComponent, {
        label: "Image",
        tag: "p",
      })
    );
    instances.get("templates")?.children.push({
      type: "id",
      value: "reserved-image-name",
    });
    const document = await parseMdxDocument({
      source: '<Image src="https://example.com/image.png" alt="Example" />\n',
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      metas,
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "resolved-template",
        templateInstanceId: "reserved-image-name",
      }),
    ]);
    expect(result.diagnostics).toEqual([]);

    const explicitNamed = await parseMdxDocument({
      source: '<ws.element ws:name="Image" />\n',
    });
    expect(
      resolveMdxTemplates({
        document: explicitNamed,
        identity,
        instances,
        metas,
      }).references
    ).toEqual([
      expect.objectContaining({
        type: "resolved-template",
        templateInstanceId: "reserved-image-name",
      }),
    ]);
  });

  test("resolves templates nested inside a direct registered component", async () => {
    const instances = createInstances();
    instances.set(
      "heading-2",
      createInstance("heading-2", elementComponent, { tag: "h2" })
    );
    instances.get("templates")?.children.push({
      type: "id",
      value: "heading-2",
    });
    const document = await parseMdxDocument({
      source: "<Box><h2>Nested</h2><Missing /></Box>\n",
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      metas: new Map([...metas, ["Box", { label: "Box" }]]),
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "resolved-template",
        path: [0, 0],
        templateInstanceId: "heading-2",
      }),
      expect.objectContaining({
        type: "unresolved-template",
        path: [0, 1],
        templateName: "Missing",
      }),
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "unresolved-template",
        templateName: "Missing",
      }),
    ]);
  });

  test.each([
    ["without a same-named template", false],
    ["with a same-named custom template", true],
  ] as const)(
    "resolves component-like JSX by the normal template precedence %s",
    async (_description, withSameNamedTemplate) => {
      const instances = createInstances();
      if (withSameNamedTemplate) {
        instances.set(
          "reserved-image-name",
          createInstance("reserved-image-name", elementComponent, {
            label: "Image",
            tag: "p",
          })
        );
        instances.get("templates")?.children.push({
          type: "id",
          value: "reserved-image-name",
        });
      }
      const document = await parseMdxDocument({
        source: "<Image>Caption</Image>\n",
      });

      const result = resolveMdxTemplates({
        document,
        identity,
        instances,
        metas,
      });

      expect(result.references).toEqual([
        expect.objectContaining(
          withSameNamedTemplate
            ? {
                type: "resolved-template",
                templateInstanceId: "reserved-image-name",
              }
            : { type: "unresolved-template", templateName: "Image" }
        ),
      ]);
      expect(result.diagnostics).toEqual(
        [
          expect.objectContaining(
            withSameNamedTemplate
              ? {}
              : { code: "unresolved-template", templateName: "Image" }
          ),
        ].filter(() => withSameNamedTemplate === false)
      );
    }
  );

  test.each(["Image", "CodeText"])(
    "keeps a missing legacy %s template unresolved",
    async (templateName) => {
      const document = await parseMdxDocument({
        source: `<ws.element ws:name="${templateName}" />\n`,
      });

      const result = resolveMdxTemplates({
        document,
        identity,
        instances: createInstances(),
        metas,
      });

      expect(result.references).toEqual([
        expect.objectContaining({
          type: "unresolved-template",
          path: [0],
          templateName,
        }),
      ]);
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: "unresolved-template",
          templateName,
        }),
      ]);
    }
  );

  test("resolves existing Markdown after a matching template is added", async () => {
    const source = "# Existing heading\n";
    const document = await parseMdxDocument({ source });
    const instances = createInstances();

    expect(
      resolveMdxTemplates({ document, identity, instances, metas }).references
    ).toEqual([]);

    instances.set(
      "heading",
      createInstance("heading", elementComponent, {
        label: "Heading 1",
        tag: "h1",
      })
    );
    instances.get("templates")?.children.push({
      type: "id",
      value: "heading",
    });

    const resolved = resolveMdxTemplates({
      document,
      identity,
      instances,
      metas,
    });
    expect(resolved.references).toEqual([
      expect.objectContaining({
        type: "resolved-template",
        path: [0],
        templateName: "Heading 1",
        templateInstanceId: "heading",
      }),
    ]);
    expect(document.children[0]).toMatchObject({
      type: "element",
      syntax: "markdown",
      tag: "h1",
    });
  });

  test("matches Markdown to normal components by their rendered HTML tags", async () => {
    const instances = createInstances();
    instances.set(
      "heading-component",
      createInstance("heading-component", "Heading", {
        label: "Component heading",
      })
    );
    instances.get("templates")?.children.push({
      type: "id",
      value: "heading-component",
    });
    for (const [id, component, label] of [
      ["paragraph-component", "Paragraph", "Component paragraph"],
      ["link-component", "Link", "Component link"],
    ] as const) {
      instances.set(id, createInstance(id, component, { label }));
      instances.get("templates")?.children.push({ type: "id", value: id });
    }
    const props = new Map([
      [
        "heading-tag",
        {
          id: "heading-tag",
          instanceId: "heading-component",
          name: "tag",
          type: "string" as const,
          value: "h2",
        },
      ],
    ]);
    const componentMetas = new Map(metas);
    componentMetas.set("Heading", {
      label: "Heading",
      presetStyle: { h1: [], h2: [] },
    });
    componentMetas.set("Paragraph", {
      label: "Paragraph",
      presetStyle: { p: [] },
    });
    componentMetas.set("Link", {
      label: "Link",
      presetStyle: { a: [] },
    });
    const document = await parseMdxDocument({
      source: "## Heading\n\nParagraph with [link](/docs).\n",
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      props,
      metas: componentMetas,
    });

    expect(result.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "resolved-template",
          path: [0],
          templateName: "Component heading",
          templateInstanceId: "heading-component",
        }),
        expect.objectContaining({
          type: "resolved-template",
          path: [1],
          templateName: "Component paragraph",
          templateInstanceId: "paragraph-component",
        }),
        expect.objectContaining({
          type: "resolved-template",
          templateName: "Component link",
          templateInstanceId: "link-component",
        }),
      ])
    );
  });

  test("does not resolve Markdown through a template with a dynamic tag", async () => {
    const instances = createInstances();
    const templates = instances.get("templates");
    if (templates === undefined) {
      throw new Error("Expected Templates container");
    }
    instances.set(
      "dynamic-heading",
      createInstance("dynamic-heading", "DynamicHeading", {
        label: "Dynamic Heading",
      })
    );
    templates.children.push({ type: "id", value: "dynamic-heading" });
    const props = new Map([
      [
        "dynamic-heading-tag",
        {
          id: "dynamic-heading-tag",
          instanceId: "dynamic-heading",
          name: "tag",
          type: "expression" as const,
          value: '"h1"',
          mode: "read" as const,
        },
      ],
    ]);
    const componentMetas = new Map(metas);
    componentMetas.set("DynamicHeading", { presetStyle: { h1: [] } });
    const document = await parseMdxDocument({ source: "# Heading\n" });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      props,
      metas: componentMetas,
    });

    expect(result.references).toEqual([]);
  });

  test("matches ordered and unordered Markdown to the List component tag", async () => {
    const instances = createInstances();
    const templates = instances.get("templates");
    if (templates === undefined) {
      throw new Error("Expected Templates container");
    }
    instances.set(
      "list",
      createInstance("list", "List", { label: "Authored List" })
    );
    templates.children.push({ type: "id", value: "list" });
    const props = new Map();
    const componentMetas = new Map(metas);
    componentMetas.set("List", {
      presetStyle: { ol: [], ul: [] },
      props: {
        ordered: {
          type: "boolean",
          control: "boolean",
          required: false,
        },
      },
      renderedTag: {
        prop: "ordered",
        values: { true: "ol", false: "ul" },
        default: "ul",
      },
    });
    const resolve = async (source: string) =>
      resolveMdxTemplates({
        document: await parseMdxDocument({ source }),
        identity,
        instances,
        props,
        metas: componentMetas,
      });

    expect((await resolve("- Default unordered\n")).references).toEqual([
      expect.objectContaining({ templateInstanceId: "list" }),
    ]);
    props.set("ordered", {
      id: "ordered",
      instanceId: "list",
      name: "ordered",
      type: "boolean" as const,
      value: false,
    });
    expect((await resolve("- Explicit unordered\n")).references).toEqual([
      expect.objectContaining({ templateInstanceId: "list" }),
    ]);
    props.set("ordered", { ...props.get("ordered")!, value: true });
    expect((await resolve("1. Ordered\n")).references).toEqual([
      expect.objectContaining({ templateInstanceId: "list" }),
    ]);
    props.set("ordered", {
      id: "ordered",
      instanceId: "list",
      name: "ordered",
      type: "expression" as const,
      value: "$ws$dataSource$ordered",
    });
    expect((await resolve("1. Dynamic\n")).references).toEqual([]);
  });

  test("does not resolve templates from malformed multiple containers", async () => {
    const instances = createInstances();
    instances.get("block")?.children.push({
      type: "id",
      value: "templates-2",
    });
    instances.set(
      "templates-2",
      createInstance("templates-2", blockTemplateComponent, {
        children: [{ type: "id", value: "heading" }],
      })
    );
    instances.set(
      "heading",
      createInstance("heading", elementComponent, {
        label: "Heading 1",
        tag: "h1",
      })
    );
    const document = await parseMdxDocument({ source: "# Heading\n" });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      metas,
    });

    expect(result.references).toEqual([]);
    expect(result.templateNames).toEqual([]);
    expect(result.templateStructure).toEqual({
      status: "invalid",
      reason: "multiple-containers",
      containerIds: ["templates", "templates-2"],
    });
  });

  test("warns and uses the semantic fallback for ambiguous standard templates", async () => {
    const instances = createInstances();
    for (const id of ["first-heading", "second-heading"]) {
      instances.set(
        id,
        createInstance(id, elementComponent, { label: id, tag: "h1" })
      );
      instances.get("templates")?.children.push({ type: "id", value: id });
    }
    const document = await parseMdxDocument({ source: "# Heading\n" });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      metas,
    });

    expect(result.references).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "ambiguous-template",
        semanticKey: "element:h1",
        templateNames: ["first-heading", "second-heading"],
        sourceRange: expect.objectContaining({}),
      }),
    ]);
  });

  test("does not resolve adapted component internals through semantic templates", async () => {
    const instances = createInstances();
    instances.set(
      "inline-code",
      createInstance("inline-code", elementComponent, {
        label: "Inline Code",
        tag: "code",
      })
    );
    instances.get("templates")?.children.push({
      type: "id",
      value: "inline-code",
    });
    const document = await parseMdxDocument({
      source: "```ts\nconst ready = true;\n```\n",
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      metas,
    });

    expect(result.references).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  test("resolves exact displayed names from the direct flat Templates list", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:name="Hero Card" tone="quiet" />

<ws.element ws:tag="section">
  <ws.element ws:name="Card" />
</ws.element>`,
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances: createInstances(),
      metas,
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "resolved-template",
        path: [0],
        templateName: "Hero Card",
        props: [expect.objectContaining({ name: "tone", value: "quiet" })],
        templateInstanceId: "hero",
      }),
      expect.objectContaining({
        type: "resolved-template",
        path: [1],
        templateName: "Hero Card",
        props: [],
        templateInstanceId: "hero",
      }),
      expect.objectContaining({
        type: "resolved-template",
        path: [1, 0],
        templateName: "Card",
        props: [],
        templateInstanceId: "card",
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
    expect(result.templateNames).toEqual(["Hero Card", "Card"]);
  });

  test("does not resolve descendants of a template entry or inexact names", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:name="Nested" />

<ws.element ws:name=" Hero Card " />`,
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances: createInstances(),
      metas,
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "unresolved-template",
        path: [0],
        templateName: "Nested",
      }),
      expect.objectContaining({
        type: "unresolved-template",
        path: [1],
        templateName: " Hero Card ",
      }),
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "unresolved-template",
        blockInstanceId: "block",
        assetId: "article",
        contentRef: "articles/hello.mdx",
        renderScope: "route:/hello",
        templateName: "Nested",
      }),
      expect.objectContaining({
        code: "unresolved-template",
        templateName: " Hero Card ",
      }),
    ]);
    expect(result.templateNames).toEqual(["Hero Card", "Card"]);
  });

  test("keeps ambiguous duplicate displayed names unresolved", async () => {
    const instances = createInstances();
    instances.set(
      "duplicate",
      createInstance("duplicate", "Card", { label: "Hero Card" })
    );
    instances.get("templates")?.children.push({
      type: "id",
      value: "duplicate",
    });
    const document = await parseMdxDocument({
      source: `<ws.element ws:name="Hero Card">Preserved</ws.element>`,
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances,
      metas,
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "unresolved-template",
        path: [0],
        templateName: "Hero Card",
      }),
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "ambiguous-template",
        semanticKey: "name:Hero Card",
      }),
    ]);
    expect(result.templateNames).toEqual(["Hero Card", "Card", "Hero Card"]);
    expect(document.children[0]).toMatchObject({
      type: "template",
      name: "Hero Card",
      children: [{ type: "text", value: "Preserved" }],
    });
  });

  test("does not resolve or diagnose descendants of an unresolved subtree", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:name="Missing">
  <ws.element ws:name="Card" />
  <ws.element ws:name="Also Missing" />
</ws.element>`,
    });

    const result = resolveMdxTemplates({
      document,
      identity,
      instances: createInstances(),
      metas,
    });

    expect(result.references).toEqual([
      expect.objectContaining({
        type: "unresolved-template",
        path: [0],
        templateName: "Missing",
      }),
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "unresolved-template",
        templateName: "Missing",
      }),
    ]);
  });
});
