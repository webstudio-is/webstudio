import { describe, expect, test } from "vitest";
import { resolveAssetValueReferences } from "./asset-value-references";
import { parseMarkdownAst } from "./markdown-ast";
import {
  discoverMdxAssetReferences,
  MdxDocumentError,
  parseMdxDocument,
  serializeMdxDocument,
} from "./mdx";

const omitSourceRanges = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(omitSourceRanges);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) =>
      key === "sourceRange" ? [] : [[key, omitSourceRanges(item)]]
    )
  );
};

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

  test("discovers and rewrites frontmatter and authored prop Asset references", async () => {
    const document = await parseMdxDocument({
      source: `---
cover: ./cover.png?size=2
---
![Hero](./hero.png#crop)

<ws.element ws:name="Card" poster="./video.jpg">
  Text containing ./ignored.png
</ws.element>
`,
    });
    const references = discoverMdxAssetReferences({
      document,
      sourcePath: "posts/post.mdx",
      assetIdsByPath: new Map([
        ["posts/cover.png", "cover"],
        ["posts/hero.png", "hero"],
        ["posts/video.jpg", "video"],
        ["posts/ignored.png", "ignored"],
      ]),
    });

    expect(references).toEqual([
      {
        path: ["frontmatter", "properties", "cover"],
        assetId: "cover",
        suffix: "?size=2",
      },
      {
        path: ["children", 0, "children", 0, "props", 0, "value"],
        assetId: "hero",
        suffix: "#crop",
      },
      {
        path: ["children", 1, "props", 0, "value"],
        assetId: "video",
      },
    ]);

    expect(
      resolveAssetValueReferences({
        value: document,
        references,
        assetUrls: {
          cover: "/assets/cover.png",
          hero: "/assets/hero.png",
          video: "/assets/video.jpg",
        },
      })
    ).toMatchObject({
      frontmatter: { properties: { cover: "/assets/cover.png?size=2" } },
      children: [
        {
          children: [
            {
              props: [
                { name: "src", value: "/assets/hero.png#crop" },
                { name: "alt", value: "Hero" },
              ],
            },
          ],
        },
        { props: [{ name: "poster", value: "/assets/video.jpg" }] },
      ],
    });
    expect(document.frontmatter.properties.cover).toBe("./cover.png?size=2");
  });

  test("serializes supported documents deterministically with semantic round trips", async () => {
    const document = await parseMdxDocument({
      source: `---
title: Example
author:
  $ref: ./author.json
---
# Hello **world**

- [x] Ready

| Name | State |
| --- | --- |
| Ada | ~~Done~~ |

<ws.element ws:tag="section" data-kind="hero">
  <ws.element ws:name="Hero Card" tone="quiet">
    ## Nested title
  </ws.element>
</ws.element>

Paragraph with <ws.element ws:tag="span">inline</ws.element> content.

{/* keep this note */}
`,
    });

    const serialized = serializeMdxDocument(document);
    expect(serializeMdxDocument(document)).toBe(serialized);
    expect(serialized).toContain("$ref: ./author.json");
    expect(serialized.indexOf("author:")).toBeLessThan(
      serialized.indexOf("title:")
    );
    expect(serialized).toContain('<ws.element ws:tag="section"');
    expect(serialized).toContain('<ws.element ws:name="Hero Card"');
    expect(serialized).toContain("{/* keep this note */}");

    const reparsed = await parseMdxDocument({ source: serialized });
    expect(omitSourceRanges(reparsed)).toEqual(omitSourceRanges(document));
  });

  test("preserves elements that Markdown cannot represent losslessly", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:tag="input" type="checkbox" disabled />

<ws.element ws:tag="code" class="custom">
  <ws.element ws:tag="strong">Nested</ws.element>
</ws.element>

<ws.element ws:tag="ul">
  <ws.element ws:tag="div">Not a list item</ws.element>
</ws.element>

<ws.element ws:tag="p" />

<ws.element ws:tag="table" />
`,
    });

    const serialized = serializeMdxDocument(document);
    const reparsed = await parseMdxDocument({ source: serialized });
    expect(omitSourceRanges(reparsed)).toEqual(omitSourceRanges(document));
  });

  test.each([
    ["empty content", ""],
    ["ordered task lists", "1. [x] Done\n2. [ ] Pending\n"],
    ["loose task lists", "- [x] Done\n\n- [ ] Pending\n"],
    ["nested lists", "- Parent\n  1. Child\n"],
    ["ordered list starts", "7. Seven\n8. Eight\n"],
    ["fenced code without a language", "```\nvalue\n```\n"],
  ])("round trips %s", async (_name, source) => {
    const document = await parseMdxDocument({ source });
    const reparsed = await parseMdxDocument({
      source: serializeMdxDocument(document),
    });

    expect(omitSourceRanges(reparsed)).toEqual(omitSourceRanges(document));
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
