import { describe, expect, test } from "vitest";
import {
  parseMdxDocument,
  standardMdxTemplateKeys,
} from "@webstudio-is/content-engine/mdx";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
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

const metas = new Map<string, WsComponentMeta>([
  ["Card", { label: "Card" }],
  ["Badge", { label: "Badge" }],
]);

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
    for (const key of standardMdxTemplateKeys) {
      const [type, name] = key.split(":");
      const id = `template-${key}`;
      templates.children.push({ type: "id", value: id });
      instances.set(
        id,
        createInstance(
          id,
          type === "element" ? elementComponent : name,
          type === "element" ? { tag: name } : {}
        )
      );
    }
    const document = await parseMdxDocument({
      source: `# Heading 1
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
`,
    });

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
      standardMdxTemplateKeys.filter(
        (key) => resolvedTemplateIds.has(`template-${key}`) === false
      )
    ).toEqual([]);
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
        code: "unresolved-template",
        templateName: "Hero Card",
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
