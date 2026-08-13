import { describe, expect, test } from "vitest";
import { parseMarkdownAst } from "./markdown-ast";
import { MdxDocumentError, parseMdxDocument } from "./mdx";

describe("parseMdxDocument", () => {
  test("parses Markdown-only input identically through Markdown and MDX", () => {
    const source = `---
title: Shared grammar
---
# Heading *with emphasis*

Paragraph with **strong**, ~~deleted~~, [inline](/docs), [reference][docs], and https://example.com.

> Blockquote

- [x] Task
- Item

1. Ordered
2. List

| Name | Ready |
| :--- | ---: |
| Ada | Yes |

\`inline code\`

\`\`\`ts
const ready = true;
\`\`\`

![Image](/image.png)

---

[docs]: /guide "Guide"
`;

    expect(parseMarkdownAst(source, "mdx")).toEqual(parseMarkdownAst(source));
  });

  test("parses frontmatter and semantic Markdown with source ranges", async () => {
    const document = await parseMdxDocument({
      source: `---
title: Hello
author:
  $ref: ./author.json
---
# Hello **world**

[Read more](/docs)
`,
    });

    expect(document.frontmatter).toEqual({
      properties: {
        title: "Hello",
        author: { $ref: "./author.json" },
      },
      sourceRange: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 5, column: 4, offset: 50 },
      },
    });
    expect(document.children).toEqual([
      {
        type: "element",
        tag: "h1",
        props: [],
        children: [
          {
            type: "text",
            value: "Hello ",
            sourceRange: {
              start: { line: 6, column: 3, offset: 53 },
              end: { line: 6, column: 9, offset: 59 },
            },
          },
          {
            type: "element",
            tag: "strong",
            props: [],
            children: [
              expect.objectContaining({ type: "text", value: "world" }),
            ],
            sourceRange: {
              start: { line: 6, column: 9, offset: 59 },
              end: { line: 6, column: 18, offset: 68 },
            },
          },
        ],
        sourceRange: {
          start: { line: 6, column: 1, offset: 51 },
          end: { line: 6, column: 18, offset: 68 },
        },
      },
      {
        type: "element",
        tag: "p",
        props: [],
        children: [
          {
            type: "element",
            tag: "a",
            props: [{ name: "href", value: "/docs" }],
            children: [
              expect.objectContaining({ type: "text", value: "Read more" }),
            ],
            sourceRange: {
              start: { line: 8, column: 1, offset: 70 },
              end: { line: 8, column: 19, offset: 88 },
            },
          },
        ],
        sourceRange: {
          start: { line: 8, column: 1, offset: 70 },
          end: { line: 8, column: 19, offset: 88 },
        },
      },
    ]);
  });

  test("maps GFM tables and inline marks to semantic elements", async () => {
    const document = await parseMdxDocument({
      source: `| Name | Ready |
| :--- | ---: |
| **Ada** | ~~No~~ |
`,
    });

    expect(document.children[0]).toMatchObject({
      type: "element",
      tag: "table",
      children: [
        {
          type: "element",
          tag: "thead",
          children: [
            {
              type: "element",
              tag: "tr",
              children: [
                {
                  type: "element",
                  tag: "th",
                  props: [{ name: "align", value: "left" }],
                },
                {
                  type: "element",
                  tag: "th",
                  props: [{ name: "align", value: "right" }],
                },
              ],
            },
          ],
        },
        {
          type: "element",
          tag: "tbody",
          children: [
            {
              type: "element",
              tag: "tr",
              children: [
                {
                  type: "element",
                  tag: "td",
                  children: [{ type: "element", tag: "strong" }],
                },
                {
                  type: "element",
                  tag: "td",
                  children: [{ type: "element", tag: "del" }],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  test("parses generic elements, template usages, and nested Markdown", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:tag="section" data-kind="hero" hidden>
  <ws.element ws:name="Hero Card" tone="quiet">
    ## Nested title
  </ws.element>
</ws.element>
`,
    });

    expect(document.children).toEqual([
      expect.objectContaining({
        type: "element",
        tag: "section",
        props: [
          { name: "data-kind", value: "hero" },
          { name: "hidden", value: true },
        ],
        children: [
          expect.objectContaining({
            type: "template",
            name: "Hero Card",
            props: [{ name: "tone", value: "quiet" }],
            children: [expect.objectContaining({ type: "element", tag: "h2" })],
          }),
        ],
      }),
    ]);
  });

  test("preserves non-executable MDX comments", async () => {
    const document = await parseMdxDocument({
      source: `{/* keep this note */}

<ws.element ws:tag="p">Text {/* inline note */}</ws.element>
`,
    });

    expect(document.children).toEqual([
      expect.objectContaining({
        type: "comment",
        value: "/* keep this note */",
      }),
      expect.objectContaining({
        type: "element",
        tag: "p",
        children: [
          expect.objectContaining({ type: "text", value: "Text " }),
          expect.objectContaining({
            type: "comment",
            value: "/* inline note */",
          }),
        ],
      }),
    ]);
  });

  test("resolves reference-style links and images", async () => {
    const document = await parseMdxDocument({
      source: `[Read][docs] and ![Cover][image]

[docs]: /guide "Guide"
[image]: /cover.png
`,
    });

    expect(document.children[0]).toMatchObject({
      type: "element",
      tag: "p",
      children: [
        {
          type: "element",
          tag: "a",
          props: [
            { name: "href", value: "/guide" },
            { name: "title", value: "Guide" },
          ],
        },
        { type: "text", value: " and " },
        {
          type: "element",
          tag: "img",
          props: [
            { name: "src", value: "/cover.png" },
            { name: "alt", value: "Cover" },
          ],
        },
      ],
    });
  });

  test("preserves tight and loose list rendering semantics", async () => {
    const tight = await parseMdxDocument({ source: "- one\n- two\n" });
    const loose = await parseMdxDocument({ source: "- one\n\n- two\n" });

    expect(tight.children[0]).toMatchObject({
      type: "element",
      tag: "ul",
      children: [
        {
          type: "element",
          tag: "li",
          children: [{ type: "text", value: "one" }],
        },
        {
          type: "element",
          tag: "li",
          children: [{ type: "text", value: "two" }],
        },
      ],
    });
    expect(loose.children[0]).toMatchObject({
      type: "element",
      tag: "ul",
      children: [
        {
          type: "element",
          tag: "li",
          children: [{ type: "element", tag: "p" }],
        },
        {
          type: "element",
          tag: "li",
          children: [{ type: "element", tag: "p" }],
        },
      ],
    });
  });

  test("preserves standard GFM output details", async () => {
    const document = await parseMdxDocument({
      source: `[missing][reference]

- [x] Done

\`\`\`js
const ready = true;
\`\`\`
`,
    });

    expect(document.children).toMatchObject([
      {
        type: "element",
        tag: "p",
        children: [{ type: "text", value: "[missing][reference]" }],
      },
      {
        type: "element",
        tag: "ul",
        props: [{ name: "class", value: "contains-task-list" }],
        children: [
          {
            type: "element",
            tag: "li",
            props: [{ name: "class", value: "task-list-item" }],
            children: [
              { type: "element", tag: "input" },
              { type: "text", value: " " },
              { type: "text", value: "Done" },
            ],
          },
        ],
      },
      {
        type: "element",
        tag: "pre",
        children: [
          {
            type: "element",
            tag: "code",
            props: [{ name: "class", value: "language-js" }],
            children: [{ type: "text", value: "const ready = true;\n" }],
          },
        ],
      },
    ]);
  });

  test.each([
    ['<ws.element ws:tag="script">alert(1)</ws.element>', "unsafe tag"],
    ['<ws.element ws:name="Card" ws:tag="div" />', "conflicting selectors"],
    [
      '<ws.element ws:tag="div" class="one" className="two" />',
      "conflicting property names",
    ],
    ['<ws.element ws:tag="div" onclick="alert(1)" />', "event prop"],
    ['<ws.element ws:tag="iframe" srcdoc="<script />" />', "srcdoc"],
    ['<ws.element ws:tag="a" href="javascript:alert(1)" />', "unsafe link URL"],
    [
      '<ws.element ws:tag="img" src="data:text/html,<script />" />',
      "unsafe source URL",
    ],
    [
      '<ws.element ws:tag="use" xlinkHref="javascript:alert(1)" />',
      "unsafe SVG link URL",
    ],
    ["[unsafe](javascript:alert(1))", "unsafe Markdown link URL"],
    ["![unsafe](data:text/html,bad)", "unsafe Markdown image URL"],
    [
      "[unsafe][target]\n\n[target]: javascript:alert(1)",
      "unsafe reference URL",
    ],
  ])("rejects %s", async (source) => {
    await expect(parseMdxDocument({ source })).rejects.toMatchObject({
      code: "unsafe-mdx",
      sourceRange: expect.objectContaining({
        start: expect.objectContaining({ line: 1 }),
      }),
    } satisfies Partial<MdxDocumentError>);
  });

  test("rejects documents that exceed structural limits", async () => {
    const deepSource =
      "<ws.element>".repeat(101) + "text" + "</ws.element>".repeat(101);
    const nodeHeavySource = "paragraph\n\n".repeat(10_001);
    const propHeavySource = `<ws.element ${Array.from(
      { length: 4_001 },
      (_, index) => `data-${index}="value"`
    ).join(" ")} />`;

    for (const source of [deepSource, nodeHeavySource, propHeavySource]) {
      await expect(parseMdxDocument({ source })).rejects.toMatchObject({
        code: "invalid-mdx",
      } satisfies Partial<MdxDocumentError>);
    }
  });

  test.each([
    ["imports", 'import Card from "./card"', "mdxjsEsm"],
    ["exports", "export const value = 1", "mdxjsEsm"],
    ["flow expressions", "{call()}", "mdxFlowExpression"],
    ["text expressions", "Hello {name}", "mdxTextExpression"],
    [
      "attribute expressions",
      '<ws.element ws:tag="div" value={3} />',
      "mdxJsxAttributeValueExpression",
    ],
    [
      "attribute spreads",
      '<ws.element ws:tag="div" {...props} />',
      "mdxJsxExpressionAttribute",
    ],
    ["arbitrary components", "<Card />", "mdxJsxFlowElement"],
    ["HTML-looking JSX", "<div>Unsafe</div>", "mdxJsxTextElement"],
  ])("rejects %s", async (_name, source, nodeType) => {
    await expect(parseMdxDocument({ source })).rejects.toMatchObject({
      code: "unsafe-mdx",
      nodeType,
      sourceRange: expect.objectContaining({
        start: expect.objectContaining({ line: 1 }),
      }),
    } satisfies Partial<MdxDocumentError>);
  });

  test("reports malformed JSX as invalid MDX", async () => {
    await expect(
      parseMdxDocument({ source: "<ws.element>" })
    ).rejects.toMatchObject({
      code: "invalid-mdx",
      sourceRange: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 },
      },
    } satisfies Partial<MdxDocumentError>);
  });
});
