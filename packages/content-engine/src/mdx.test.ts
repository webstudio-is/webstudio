import { describe, expect, test } from "vitest";
import { resolveAssetValueReferences } from "./asset-value-references";
import { parseMarkdownAst } from "./markdown-ast";
import {
  createMdxCodeBlock,
  createMdxSourceDiagnostics,
  discoverMdxAssetReferences,
  isMdxTemplateComponentName,
  MdxDocumentError,
  parseMdxDocument,
  parseMdxDocumentRecovering,
  validateMdxDocumentSource,
  preferMarkdownSyntax,
  readMdxCodeBlock,
  replaceMdxFrontmatter,
  rewriteMdxAssetReferences,
  serializeMdxDocument,
  validateTextAssetSource,
  validateTextAssetSourceBytes,
  type MdxAuthoredNode,
  type MdxDocument,
} from "./mdx";
import { contentEngineLimits } from "./limits";

test("validates template names as PascalCase JavaScript identifiers", () => {
  expect(isMdxTemplateComponentName("PromotionCard")).toBe(true);
  expect(isMdxTemplateComponentName("ÉditionCard")).toBe(true);
  expect(isMdxTemplateComponentName("Card$2")).toBe(true);
  expect(isMdxTemplateComponentName("promotionCard")).toBe(false);
  expect(isMdxTemplateComponentName("$Card")).toBe(false);
  expect(isMdxTemplateComponentName("Promotion-Card")).toBe(false);
});

test("canonicalizes the legacy public template node shape", () => {
  const document: MdxDocument = {
    frontmatter: { properties: {} },
    children: [
      {
        type: "template",
        name: "Card",
        props: [],
        children: [],
        mdxMode: "flow",
      },
    ],
  };

  expect(serializeMdxDocument(document)).toBe("<Card />\n");
});

test("creates and reads canonical fenced code blocks", async () => {
  const node = createMdxCodeBlock({
    value: "const ready = true;",
    language: "javascript",
  });
  const source = serializeMdxDocument({
    frontmatter: { properties: {} },
    children: [node],
  });
  const document = await parseMdxDocument({ source });

  expect(source).toBe("```javascript\nconst ready = true;\n```\n");
  expect(readMdxCodeBlock(document.children[0]!)).toEqual({
    value: "const ready = true;",
    language: "javascript",
  });
});

test("rewrites Markdown, MDX, and frontmatter Asset references together", async () => {
  const rewritten = await rewriteMdxAssetReferences({
    source: [
      "---",
      "hero: images/hero.png?width=1200",
      "---",
      "",
      "![Hero](images/hero.png#cover)",
      "",
      '<ws.element ws:tag="img" src="images/hero.png" />',
    ].join("\n"),
    sourcePath: "article.mdx",
    assetPaths: new Map([["hero", "images/hero.png"]]),
    replacementPaths: new Map([["hero", "hero_1.png"]]),
  });

  expect(rewritten).toContain("hero: hero_1.png?width=1200");
  expect(rewritten).toContain("![Hero](hero_1.png#cover)");
  expect(rewritten).toContain('src="hero_1.png"');
});

test("preserves authored frontmatter during body-only Asset rewrites", async () => {
  const frontmatter = `---
# keep formatting
title: 'Example'
---
`;
  const rewritten = await rewriteMdxAssetReferences({
    source: `${frontmatter}![Hero](images/hero.png)`,
    sourcePath: "article.mdx",
    assetPaths: new Map([["hero", "images/hero.png"]]),
    replacementPaths: new Map([["hero", "hero_1.png"]]),
  });

  expect(rewritten).toBe(`${frontmatter}![Hero](hero_1.png)\n`);
});

test("maps recoverable and unrecoverable MDX failures consistently", () => {
  const sourceRange = {
    start: { line: 2, column: 3, offset: 5 },
    end: { line: 2, column: 8, offset: 10 },
  };
  expect(
    createMdxSourceDiagnostics([
      new MdxDocumentError({
        code: "unsafe-mdx",
        message: "Unsupported expression",
        reason: "Executable expressions are not supported",
        nodeType: "mdxTextExpression",
        sourceRange,
      }),
      new MdxDocumentError({
        code: "invalid-mdx",
        message: "Unexpected closing tag",
        sourceRange,
      }),
    ])
  ).toEqual([
    {
      code: "unsafe-mdx",
      severity: "warning",
      message: "Executable expressions are not supported",
      reason: "Executable expressions are not supported",
      nodeType: "mdxTextExpression",
      sourceRange,
    },
    {
      code: "invalid-mdx",
      severity: "error",
      message: "Unexpected closing tag",
      sourceRange,
    },
  ]);
});

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

const forceGenericMdx = (node: MdxAuthoredNode): MdxAuthoredNode => {
  if (
    node.type === "text" ||
    node.type === "comment" ||
    node.type === "opaque"
  ) {
    return node;
  }
  if (node.type === "template") {
    return { ...node, children: node.children.map(forceGenericMdx) };
  }
  return {
    ...node,
    syntax: "mdx",
    mdxMode: "flow",
    children: node.children.map(forceGenericMdx),
  };
};

describe("parseMdxDocument", () => {
  test("parses and preserves safe named JSX template references", async () => {
    const source = `<Card tone="quiet">\n  ## Nested heading\n</Card>\n`;
    const document = await parseMdxDocument({ source });

    expect(omitSourceRanges(document.children)).toEqual([
      {
        type: "template",
        syntax: "jsx",
        selfClosing: false,
        name: "Card",
        props: [{ name: "tone", value: "quiet" }],
        children: [
          {
            type: "element",
            syntax: "markdown",
            tag: "h2",
            props: [],
            children: [{ type: "text", value: "Nested heading" }],
          },
        ],
        mdxMode: "flow",
      },
    ]);
    expect(
      document.children[0]?.type === "template"
        ? document.children[0].props[0]?.sourceRange
        : undefined
    ).toEqual({
      start: { line: 1, column: 7, offset: 6 },
      end: { line: 1, column: 19, offset: 18 },
    });
    expect(serializeMdxDocument(document)).toBe(source);
  });

  test("parses and preserves intrinsic HTML JSX", async () => {
    const source = `<section data-kind="hero">\n  <h2>Title</h2>\n</section>\n`;
    const document = await parseMdxDocument({ source });

    expect(omitSourceRanges(document.children)).toEqual([
      {
        type: "element",
        syntax: "mdx",
        tag: "section",
        props: [{ name: "data-kind", value: "hero" }],
        children: [
          {
            type: "element",
            syntax: "mdx",
            tag: "h2",
            props: [],
            children: [{ type: "text", value: "Title" }],
            mdxMode: "text",
          },
        ],
        mdxMode: "flow",
      },
    ]);
    expect(serializeMdxDocument(document)).toBe(source);
  });

  test("parses and preserves intrinsic SVG JSX", async () => {
    const source = `<svg viewBox="0 0 24 24">
  <path d="M0 0h24v24H0z" />
</svg>
`;
    const document = await parseMdxDocument({ source });

    expect(document.children[0]).toMatchObject({
      type: "element",
      syntax: "mdx",
      tag: "svg",
      children: [
        expect.objectContaining({
          type: "element",
          syntax: "mdx",
          tag: "path",
        }),
      ],
    });
    expect(serializeMdxDocument(document)).toBe(source);
  });

  test.each(["Foo", "my-widget"])(
    "preserves legacy generic tag %s when direct JSX would change its meaning",
    async (tag) => {
      const legacySource = `<ws.element ws:tag="${tag}">Text</ws.element>\n`;
      const document = await parseMdxDocument({ source: legacySource });
      const serialized = serializeMdxDocument(document);

      expect(serialized).toBe(legacySource);
      expect(
        omitSourceRanges(await parseMdxDocument({ source: serialized }))
      ).toEqual(omitSourceRanges(document));
    }
  );

  test("preserves self-closing and explicitly empty template children", async () => {
    const selfClosing = await parseMdxDocument({ source: "<Card />\n" });
    const explicitlyEmpty = await parseMdxDocument({
      source: "<Card></Card>\n",
    });

    expect(selfClosing.children[0]).toMatchObject({
      type: "template",
      syntax: "jsx",
      selfClosing: true,
      children: [],
    });
    expect(explicitlyEmpty.children[0]).toMatchObject({
      type: "template",
      syntax: "jsx",
      selfClosing: false,
      children: [],
    });
    expect(serializeMdxDocument(selfClosing)).toBe("<Card />\n");
    expect(serializeMdxDocument(explicitlyEmpty)).toBe("<Card>\n\n</Card>\n");
    expect(
      (
        await parseMdxDocument({
          source: serializeMdxDocument(explicitlyEmpty),
        })
      ).children[0]
    ).toMatchObject({ type: "template", selfClosing: false, children: [] });
  });

  test("preserves an explicitly empty inline template", async () => {
    const source = "Before <Card></Card> after\n";
    const document = await parseMdxDocument({ source });
    const paragraph = document.children[0];

    expect(paragraph).toMatchObject({ type: "element", tag: "p" });
    expect(
      paragraph?.type === "element" ? paragraph.children[1] : undefined
    ).toMatchObject({
      type: "template",
      mdxMode: "text",
      selfClosing: false,
      children: [],
    });
    expect(serializeMdxDocument(document)).toBe(source);
  });

  test("keeps line-separated JSX components outside a Markdown paragraph", async () => {
    const source =
      '<PromotionCard>test</PromotionCard>\n<Heading tag="h1">Test</Heading>\n';
    const document = await parseMdxDocument({ source });

    expect(document.children).toMatchObject([
      { type: "template", name: "PromotionCard" },
      { type: "template", name: "Heading" },
    ]);
    expect(serializeMdxDocument(document)).toBe(
      '<PromotionCard>test</PromotionCard>\n\n<Heading tag="h1">Test</Heading>\n'
    );

    const inlineDocument = await parseMdxDocument({
      source: "<Badge>New</Badge> <Badge>Sale</Badge>\n",
    });
    expect(inlineDocument.children[0]).toMatchObject({
      type: "element",
      tag: "p",
    });
  });

  test("tracks nested template closing syntax independently", async () => {
    const document = await parseMdxDocument({
      source: "<Card>\n  <Link />\n</Card>\n",
    });
    const card = document.children[0];

    expect(card).toMatchObject({ type: "template", selfClosing: false });
    expect(
      card?.type === "template" ? card.children[0] : undefined
    ).toMatchObject({ type: "template", selfClosing: true });
  });

  test.each([
    "Base",
    "Link",
    "Meta",
    "Noscript",
    "Script",
    "Style",
    "Template",
    "Title",
  ])(
    "accepts capitalized template component %s despite the intrinsic denylist",
    async (name) => {
      const document = await parseMdxDocument({ source: `<${name} />\n` });

      expect(document.children[0]).toMatchObject({
        type: "template",
        syntax: "jsx",
        selfClosing: true,
        name,
      });
      expect(serializeMdxDocument(document)).toBe(`<${name} />\n`);
      await expect(
        parseMdxDocument({ source: `<${name.toLowerCase()} />\n` })
      ).rejects.toMatchObject({ code: "unsafe-mdx" });
    }
  );

  test("rejects reserved Webstudio selectors on named JSX templates", async () => {
    await expect(
      parseMdxDocument({ source: '<Card ws:name="Other" />\n' })
    ).rejects.toMatchObject({
      code: "unsafe-mdx",
      reason: "Named MDX templates cannot use ws:name or ws:tag",
    });
    await expect(
      parseMdxDocument({ source: '<Card ws:tag="section" />\n' })
    ).rejects.toMatchObject({
      code: "unsafe-mdx",
      reason: "Named MDX templates cannot use ws:name or ws:tag",
    });
  });

  test("falls back to ws.element when a JSX template name is not serializable", async () => {
    const source = serializeMdxDocument({
      frontmatter: { properties: {} },
      children: [
        {
          type: "template",
          syntax: "jsx",
          selfClosing: true,
          name: "Hero Card",
          props: [],
          children: [],
          mdxMode: "flow",
        },
      ],
    });

    expect(source).toBe('<ws.element ws:name="Hero Card" />\n');
    expect((await parseMdxDocument({ source })).children[0]).toMatchObject({
      type: "template",
      syntax: "ws-element",
      selfClosing: true,
      name: "Hero Card",
    });
  });

  test("rejects reserved selectors in programmatically created named JSX", () => {
    expect(() =>
      serializeMdxDocument({
        frontmatter: { properties: {} },
        children: [
          {
            type: "template",
            syntax: "jsx",
            selfClosing: true,
            name: "Card",
            props: [{ name: "ws:name", value: "Other" }],
            children: [],
            mdxMode: "flow",
          },
        ],
      })
    ).toThrow("Named MDX templates cannot use ws:name or ws:tag");
  });

  test("preserves legacy ws.element template reference syntax", async () => {
    const source = '<ws.element ws:name="Hero Card" />\n';
    const document = await parseMdxDocument({ source });

    expect(omitSourceRanges(document.children)).toEqual([
      {
        type: "template",
        syntax: "ws-element",
        selfClosing: true,
        name: "Hero Card",
        props: [],
        children: [],
        mdxMode: "flow",
      },
    ]);
    expect(serializeMdxDocument(document)).toBe(source);
  });

  test("preserves explicitly empty legacy template children", async () => {
    const document = await parseMdxDocument({
      source: '<ws.element ws:name="Hero Card"></ws.element>\n',
    });

    expect(document.children[0]).toMatchObject({
      type: "template",
      syntax: "ws-element",
      selfClosing: false,
      children: [],
    });
    expect(serializeMdxDocument(document)).toBe(
      '<ws.element ws:name="Hero Card">\n\n</ws.element>\n'
    );
  });

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
      authoredSource: `---
title: Hello
author:
  $ref: ./author.json
---
`,
      sourceRange: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 5, column: 4, offset: 50 },
      },
    });
    expect(document.children).toEqual([
      {
        type: "element",
        syntax: "markdown",
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
            syntax: "markdown",
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
        syntax: "markdown",
        tag: "p",
        props: [],
        children: [
          {
            type: "element",
            syntax: "markdown",
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
        syntax: "mdx",
        mdxMode: "flow",
        tag: "section",
        props: [
          expect.objectContaining({ name: "data-kind", value: "hero" }),
          expect.objectContaining({ name: "hidden", value: true }),
        ],
        children: [
          expect.objectContaining({
            type: "template",
            mdxMode: "flow",
            name: "Hero Card",
            props: [expect.objectContaining({ name: "tone", value: "quiet" })],
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
        mdxMode: "flow",
        value: "/* keep this note */",
      }),
      expect.objectContaining({
        type: "element",
        tag: "p",
        children: [
          expect.objectContaining({ type: "text", value: "Text " }),
          expect.objectContaining({
            type: "comment",
            mdxMode: "text",
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
            syntax: "markdown",
            tag: "li",
            props: [{ name: "class", value: "task-list-item" }],
            markdownListItem: { checked: true, spread: false },
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
    expect(serialized.indexOf("title:")).toBeLessThan(
      serialized.indexOf("author:")
    );
    expect(serialized).toContain('<section data-kind="hero"');
    expect(serialized).toContain('<ws.element ws:name="Hero Card"');
    expect(serialized).toContain("{/* keep this note */}");

    const reparsed = await parseMdxDocument({ source: serialized });
    expect(omitSourceRanges(reparsed)).toEqual(omitSourceRanges(document));
  });

  test("preserves authored frontmatter while serializing body edits", async () => {
    const frontmatter = `\uFEFF---\r\n# Keep this comment\r\ntitle: 'Quoted title'\r\ndraft: FALSE\r\n---\r\n`;
    const document = await parseMdxDocument({
      source: `${frontmatter}# Before\n`,
    });

    const source = serializeMdxDocument({
      ...document,
      children: [
        {
          type: "element",
          syntax: "markdown",
          tag: "h1",
          props: [],
          children: [{ type: "text", value: "After" }],
        },
      ],
    });

    expect(source).toBe(`${frontmatter}# After\n`);
  });

  test("separates an added body from frontmatter that ended at EOF", async () => {
    const document = await parseMdxDocument({
      source: "---\ntitle: Empty post\n---",
    });

    const source = serializeMdxDocument({
      ...document,
      children: [
        {
          type: "element",
          syntax: "markdown",
          tag: "p",
          props: [],
          children: [{ type: "text", value: "New body" }],
        },
      ],
    });

    expect(source).toBe("---\ntitle: Empty post\n---\nNew body\n");
  });

  test("prefers Markdown while preserving elements that require JSX", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:tag="p">Read the <ws.element ws:tag="a" href="/guide">guide</ws.element>.</ws.element>

<ws.element ws:tag="ul">
  <ws.element ws:tag="li">First</ws.element>

  <ws.element ws:tag="li">Second</ws.element>
</ws.element>

<ws.element ws:tag="section" data-kind="hero"><ws.element ws:tag="h2">Title</ws.element></ws.element>`,
    });
    const source = serializeMdxDocument(await preferMarkdownSyntax(document));

    expect(source).toContain("Read the [guide](/guide).");
    expect(source).toContain("-   First\n-   Second");
    expect(source).not.toContain('<ws.element ws:tag="p"');
    expect(source).not.toContain('<ws.element ws:tag="ul"');
    expect(source).toContain('<section data-kind="hero">');
    expect(source).toContain("## Title");
    expect(source).not.toContain('<ws.element ws:tag="h2"');
    expect(
      serializeMdxDocument(
        await preferMarkdownSyntax(await parseMdxDocument({ source }))
      )
    ).toBe(source);
  });

  test.each([
    ["ul", "- First\n\n* Second", "-   First\n\n*   Second\n"],
    ["ol", "1. First\n\n1) Second", "1.  First\n\n1)  Second\n"],
  ])(
    "keeps adjacent %s elements separate with MDX-safe Markdown",
    async (tag, input, expected) => {
      const document = await parseMdxDocument({ source: input });
      const source = serializeMdxDocument(document);

      expect(source).toBe(expected);
      await expect(parseMdxDocument({ source })).resolves.toMatchObject({
        children: [{ tag }, { tag }],
      });
    }
  );

  test.each([
    `<ws.element ws:tag="a" href="https://google.com/">Test link</ws.element>`,
    `<ws.element ws:tag="a" href="https://google.com/">
Test link
</ws.element>`,
  ])("serializes a standalone Markdown link without JSX", async (source) => {
    const document = await parseMdxDocument({ source });

    expect(serializeMdxDocument(await preferMarkdownSyntax(document))).toBe(
      "[Test link](https://google.com/)\n"
    );
  });

  test("serializes every generic Content Block Markdown template as Markdown", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:tag="p">Paragraph</ws.element>

<ws.element ws:tag="h1">Heading 1</ws.element>

<ws.element ws:tag="h2">Heading 2</ws.element>

<ws.element ws:tag="h3">Heading 3</ws.element>

<ws.element ws:tag="h4">Heading 4</ws.element>

<ws.element ws:tag="h5">Heading 5</ws.element>

<ws.element ws:tag="h6">Heading 6</ws.element>

<ws.element ws:tag="ul"><ws.element ws:tag="li">Unordered</ws.element></ws.element>

<ws.element ws:tag="ol"><ws.element ws:tag="li">Ordered</ws.element></ws.element>

<ws.element ws:tag="a" href="/guide">Link</ws.element>

<ws.element ws:tag="hr" />

<ws.element ws:tag="blockquote">Quote</ws.element>`,
    });

    const source = serializeMdxDocument(await preferMarkdownSyntax(document));

    expect(source).not.toContain("<ws.element");
    expect(source).toContain("# Heading 1");
    expect(source).toContain("###### Heading 6");
    expect(source).toContain("-   Unordered");
    expect(source).toContain("1.  Ordered");
    expect(source).toContain("[Link](/guide)");
    expect(source).toContain("> Quote");
  });

  test("canonicalizes every Markdown-native element without JSX", async () => {
    const markdown = `# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

Paragraph with **strong**, _emphasis_, ~~deleted~~, [link](/guide), ![image](/image.png), and \`code\`.\\
Next line.

> Quote

- Unordered

1. Ordered

- [x] Task

---

\`\`\`js
const ready = true;
\`\`\`

| Name | Ready |
| :--- | ---: |
| Ada | Yes |
`;
    const document = await parseMdxDocument({ source: markdown });
    const genericDocument = {
      ...document,
      children: document.children.map(forceGenericMdx),
    };

    const source = serializeMdxDocument(
      await preferMarkdownSyntax(genericDocument)
    );

    expect(source).not.toContain("<ws.element");
    expect(omitSourceRanges(await parseMdxDocument({ source }))).toEqual(
      omitSourceRanges(document)
    );
  });

  test.each([
    ["blockquote", "> Quote\n"],
    ["break", "First\\\nSecond\n"],
    ["code", "```js\nconst ready = true;\n```\n"],
    ["definition", "[Guide][guide]\n\n[guide]: /guide\n"],
    ["emphasis", "*Emphasis*\n"],
    ["heading", "# Heading\n"],
    ["image", "![Image](/image.png)\n"],
    ["image reference", "![Image][image]\n\n[image]: /image.png\n"],
    ["inline code", "`const ready = true`\n"],
    ["link", "[Guide](/guide)\n"],
    ["link reference", "[Guide][guide]\n\n[guide]: /guide\n"],
    ["list", "- First\n- Second\n"],
    ["list item", "- Item\n"],
    ["paragraph", "Paragraph\n"],
    ["strong", "**Strong**\n"],
    ["thematic break", "***\n"],
  ])(
    "converts the core Markdown %s construct without JSX",
    async (_name, source) => {
      const document = await parseMdxDocument({ source });
      const genericDocument = {
        ...document,
        children: document.children.map(forceGenericMdx),
      };
      const markdown = serializeMdxDocument(
        await preferMarkdownSyntax(genericDocument)
      );

      expect(markdown).not.toContain("<ws.element");
      expect(
        omitSourceRanges(await parseMdxDocument({ source: markdown }))
      ).toEqual(omitSourceRanges(document));
    }
  );

  test("preserves elements that Markdown cannot represent losslessly", async () => {
    const document = await parseMdxDocument({
      source: `<ws.element ws:tag="input" type="checkbox" disabled />

<ws.element ws:tag="code" class="custom">
  <ws.element ws:tag="strong">Nested</ws.element>
</ws.element>

<ws.element ws:tag="a" href="/guide" target="_blank">Guide</ws.element>

<ws.element ws:tag="ul">
  <ws.element ws:tag="div">Not a list item</ws.element>
</ws.element>

<ws.element ws:tag="p" />

<ws.element ws:tag="table" />

<ws.element ws:tag="li">Standalone item</ws.element>

<ws.element ws:tag="div">line
next</ws.element>

<ws.element ws:tag="div">before {/* inline */} after</ws.element>

<ws.element ws:tag="pre"><ws.element ws:tag="code" /></ws.element>

<ws.element ws:tag="ol" start="007">
  <ws.element ws:tag="li">Leading zero</ws.element>
</ws.element>

<ws.element ws:tag="table">
  <ws.element ws:tag="thead">
    <ws.element ws:tag="tr">
      <ws.element ws:tag="th">
        <ws.element ws:tag="p">Invalid cell block</ws.element>
      </ws.element>
    </ws.element>
  </ws.element>
</ws.element>
`,
    });

    const serialized = serializeMdxDocument(document);
    const reparsed = await parseMdxDocument({ source: serialized });
    expect(omitSourceRanges(reparsed)).toEqual(omitSourceRanges(document));

    const preferred = serializeMdxDocument(
      await preferMarkdownSyntax(document)
    );
    expect(preferred).toContain("<ul>\n  <div>Not a list item</div>\n</ul>");
    expect(preferred).toContain('<a href="/guide" target="_blank">Guide</a>');
    expect(preferred).toContain('<ol start="007">');
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

  test("preserves template prop names while normalizing HTML prop names", async () => {
    const source = serializeMdxDocument({
      frontmatter: { properties: {} },
      children: [
        {
          type: "template",
          syntax: "ws-element",
          selfClosing: true,
          name: "Card",
          props: [
            { name: "className", value: "featured" },
            { name: "htmlFor", value: "title" },
            { name: "tabIndex", value: "0" },
            { name: "readOnly", value: true },
          ],
          children: [],
          mdxMode: "flow",
        },
      ],
    });

    expect(source).toBe(
      '<Card className="featured" htmlFor="title" tabIndex="0" readOnly />\n'
    );
    expect(omitSourceRanges(await parseMdxDocument({ source }))).toMatchObject({
      frontmatter: { properties: {} },
      children: [
        {
          type: "template",
          props: [
            { name: "className", value: "featured" },
            { name: "htmlFor", value: "title" },
            { name: "tabIndex", value: "0" },
            { name: "readOnly", value: true },
          ],
        },
      ],
    });

    const element = await parseMdxDocument({
      source:
        '<ws.element ws:tag="label" className="featured" htmlFor="title" tabIndex="0" />',
    });
    expect(omitSourceRanges(element.children[0])).toMatchObject({
      type: "element",
      props: [
        { name: "class", value: "featured" },
        { name: "for", value: "title" },
        { name: "tabindex", value: "0" },
      ],
    });
  });

  test("canonicalizes legacy template JSX without component metadata", async () => {
    const source = '<ws.element ws:name="Card" class="featured" />\n';
    const document = await parseMdxDocument({ source });

    expect(serializeMdxDocument(document)).toBe('<Card class="featured" />\n');
  });

  test("preserves legacy template prop aliases while canonicalizing syntax", async () => {
    const source =
      '<ws.element ws:name="Card" class="legacy" className="canonical" />\n';
    const document = await parseMdxDocument({ source });

    expect(document.children[0]).toMatchObject({
      type: "template",
      props: [
        { name: "class", value: "legacy" },
        { name: "className", value: "canonical" },
      ],
    });
    expect(serializeMdxDocument(document)).toBe(
      '<Card class="legacy" className="canonical" />\n'
    );
  });

  test("preserves component JSX prop aliases for metadata-aware materialization", async () => {
    const source =
      '<Image class="legacy" className="canonical" alt="Example" />\n';
    const document = await parseMdxDocument({ source });

    expect(document.children[0]).toMatchObject({
      type: "template",
      syntax: "jsx",
      name: "Image",
      props: [
        { name: "class", value: "legacy" },
        { name: "className", value: "canonical" },
        { name: "alt", value: "Example" },
      ],
    });
    expect(serializeMdxDocument(document)).toBe(source);
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
  }, 15_000);

  test.each([
    ["imports", 'import Card from "./card"', "mdxjsEsm"],
    ["exports", "export const value = 1", "mdxjsEsm"],
    ["flow expressions", "{call()}", "mdxFlowExpression"],
    ["text expressions", "Hello {name}", "mdxTextExpression"],
    [
      "attribute expressions",
      '<ws.element ws:tag="div" value={1_000} />',
      "mdxJsxAttributeValueExpression",
    ],
    [
      "attribute spreads",
      '<ws.element ws:tag="div" {...props} />',
      "mdxJsxExpressionAttribute",
    ],
    ["unknown lowercase JSX", "<card />", "mdxJsxFlowElement"],
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

describe("replaceMdxFrontmatter", () => {
  test("updates only frontmatter and preserves the body byte-for-byte", async () => {
    const body = `# Heading\n\n<ws.element ws:name="Hero Card">\n  Body\n</ws.element>\n`;
    const source = `---\ntitle: Before\n---\n\n${body}`;

    expect(
      await replaceMdxFrontmatter({
        source,
        properties: { nested: [1, true], title: "After" },
      })
    ).toBe(`---\nnested:\n  - 1\n  - true\ntitle: After\n---\n\n${body}`);
  });

  test("prepends frontmatter without rewriting a document body", async () => {
    const source = "Paragraph  \nwith hard break\n";

    expect(
      await replaceMdxFrontmatter({ source, properties: { draft: false } })
    ).toBe(`---\ndraft: false\n---\n\n${source}`);
  });

  test("updates frontmatter even when the MDX body is structurally invalid", async () => {
    const body = '<ws.element ws:name="Hero">\n';
    const source = `---\ntitle: Before\n---\n\n${body}`;

    expect(
      await replaceMdxFrontmatter({ source, properties: { title: "After" } })
    ).toBe(`---\ntitle: After\n---\n\n${body}`);
  });

  test("preserves a byte-order mark and non-ASCII body", async () => {
    const source = `\uFEFF---\ntitle: Olá\n---\n\nOlá 👋\n`;

    expect(
      await replaceMdxFrontmatter({ source, properties: { title: "Até" } })
    ).toBe(`\uFEFF---\ntitle: Até\n---\n\nOlá 👋\n`);
  });
});

describe("parseMdxDocumentRecovering", () => {
  test("uses fatal UTF-8 decoding for byte source validation", async () => {
    const invalidUtf8 = new Uint8Array([0xc3, 0x28]);

    await expect(
      validateTextAssetSourceBytes({ format: "md", source: invalidUtf8 })
    ).resolves.toEqual({
      format: "md",
      diagnostics: [
        {
          code: "MARKDOWN_BODY_DECODING_FAILED",
          severity: "error",
          message: "Markdown content is not valid UTF-8",
        },
      ],
    });
    await expect(
      validateTextAssetSourceBytes({ format: "mdx", source: invalidUtf8 })
    ).resolves.toEqual({
      format: "mdx",
      diagnostics: [
        {
          code: "invalid-mdx",
          severity: "error",
          message: "MDX content is not valid UTF-8",
        },
      ],
      recovery: {
        status: "unrecoverable",
        diagnostics: [
          expect.objectContaining({
            code: "invalid-mdx",
            message: "MDX content is not valid UTF-8",
          }),
        ],
      },
    });
  });

  test("returns decoded source with byte source validation", async () => {
    await expect(
      validateTextAssetSourceBytes({
        format: "mdx",
        source: new TextEncoder().encode("# Valid\n"),
      })
    ).resolves.toMatchObject({
      format: "mdx",
      source: "# Valid\n",
      diagnostics: [],
      recovery: { status: "parsed" },
    });
  });

  test("uses the shared text validator for Markdown file size errors", async () => {
    await expect(
      validateTextAssetSource({
        format: "md",
        source: "x".repeat(contentEngineLimits.hydratedFileBytes + 1),
      })
    ).resolves.toMatchObject({
      diagnostics: [
        {
          code: "MARKDOWN_BODY_BYTES_EXCEEDED",
          severity: "error",
        },
      ],
    });
  });

  test("reports every recoverable problem as a warning", async () => {
    const result = await validateMdxDocumentSource({
      source: "---\na: 1\na: 2\nb: 1\nb: 2\n---\n\n{first()}\n\n{second()}\n",
    });

    expect(result.diagnostics).toMatchObject([
      { severity: "warning", code: "FRONTMATTER_INVALID", line: 3 },
      { severity: "warning", code: "FRONTMATTER_INVALID", line: 5 },
      {
        severity: "warning",
        message: "Executable MDX expressions are not supported",
      },
      {
        severity: "warning",
        message: "Executable MDX expressions are not supported",
      },
    ]);
  });

  test("continues after an unsupported component to report every sibling", async () => {
    const result = await validateMdxDocumentSource({
      source: "{first()}\n\n<Card.Item />\n\n{second()}\n",
    });

    expect(result.diagnostics).toEqual([
      {
        code: "unsafe-mdx",
        severity: "warning",
        message: "Executable MDX expressions are not supported",
        nodeType: "mdxFlowExpression",
        reason: "Executable MDX expressions are not supported",
        sourceRange: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 10, offset: 9 },
        },
      },
      {
        code: "unsafe-mdx",
        severity: "warning",
        message:
          "Only standard HTML and SVG elements and named template components are supported in authored MDX",
        nodeType: "mdxJsxFlowElement",
        reason:
          "Only standard HTML and SVG elements and named template components are supported in authored MDX",
        sourceRange: {
          start: { line: 3, column: 1, offset: 11 },
          end: { line: 3, column: 14, offset: 24 },
        },
      },
      {
        code: "unsafe-mdx",
        severity: "warning",
        message: "Executable MDX expressions are not supported",
        nodeType: "mdxFlowExpression",
        reason: "Executable MDX expressions are not supported",
        sourceRange: {
          start: { line: 5, column: 1, offset: 26 },
          end: { line: 5, column: 11, offset: 36 },
        },
      },
    ]);
  });

  test("reports diagnostics nested inside an unsupported component", async () => {
    const result = await validateMdxDocumentSource({
      source: "<Card.Item>{danger()}<Other.Item /></Card.Item>\n",
    });

    expect(result.diagnostics.map(({ message }) => message)).toEqual([
      "Only standard HTML and SVG elements and named template components are supported in authored MDX",
      "Executable MDX expressions are not supported",
      "Only standard HTML and SVG elements and named template components are supported in authored MDX",
    ]);
    expect(
      result.diagnostics.map((diagnostic) =>
        "sourceRange" in diagnostic
          ? diagnostic.sourceRange?.start.offset
          : undefined
      )
    ).toEqual([0, 11, 21]);
  });

  test("ignores invalid JSX properties without dropping the element", async () => {
    const source =
      '<ws.element ws:tag="a" href="/safe" onclick="alert(1)">Kept</ws.element>\n';

    const recovered = await parseMdxDocumentRecovering({ source });

    expect(recovered).toMatchObject({
      status: "parsed",
      document: {
        children: [
          {
            type: "element",
            tag: "a",
            props: [{ name: "href", value: "/safe" }],
            children: [{ type: "text", value: "Kept" }],
          },
        ],
      },
      diagnostics: [
        expect.objectContaining({
          code: "unsafe-mdx",
          reason: "MDX JSX prop onclick is not supported",
        }),
      ],
    });
  });

  test("preserves an unsafe subtree while continuing with valid siblings", async () => {
    const source = "# Before\n\n{danger()}\n\n# After\n";

    const result = await parseMdxDocumentRecovering({ source });

    expect(result.status).toBe("parsed");
    if (result.status !== "parsed") {
      throw new Error("Expected a recoverable document");
    }
    expect(result.diagnostics).toHaveLength(1);
    expect(result.document.children.map(({ type }) => type)).toEqual([
      "element",
      "opaque",
      "element",
    ]);
    expect(serializeMdxDocument(result.document)).toBe(source);
  });

  test("keeps a valid body available when frontmatter is invalid", async () => {
    const source = `---
title: [broken
---
# Visible body
`;

    const result = await parseMdxDocumentRecovering({ source });

    expect(result).toMatchObject({
      status: "parsed",
      document: {
        frontmatter: {
          properties: {},
          authoredSource: "---\ntitle: [broken\n---\n",
        },
        children: [
          {
            type: "element",
            syntax: "markdown",
            tag: "h1",
            children: [{ type: "text", value: "Visible body" }],
          },
        ],
      },
      diagnostics: [{ code: "invalid-mdx" }],
    });
    if (result.status !== "parsed") {
      throw new Error("Expected a recoverable body");
    }
    expect(serializeMdxDocument(result.document)).toBe(source);
  });

  test("reports structurally invalid MDX without inventing a document", async () => {
    const result = await parseMdxDocumentRecovering({
      source: "# Before\n\n<ws.element",
    });

    expect(result).toMatchObject({
      status: "unrecoverable",
      diagnostics: [{ code: "invalid-mdx" }],
    });
  });
});
