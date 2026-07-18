import { describe, expect, test, vi } from "vitest";
import {
  extractMarkdownBody,
  extractMarkdownBodyAndExcerpt,
  extractMarkdownExcerpt,
  extractMarkdownFrontmatter,
  MarkdownMetadataError,
} from "./markdown";

describe("extractMarkdownFrontmatter", () => {
  test("parses schema-less nested YAML without retaining the body", async () => {
    const result = await extractMarkdownFrontmatter(`---
title: Hello
publishedAt: 2026-07-18
draft: false
author:
  name: Oleg
tags: [web, studio]
---
# A body that is not metadata
`);

    expect(result.properties).toEqual({
      title: "Hello",
      publishedAt: "2026-07-18",
      draft: false,
      author: { name: "Oleg" },
      tags: ["web", "studio"],
    });
    expect(result.frontmatterBytes).toBeGreaterThan(0);
    expect(result.consumedBytes).toBeLessThan(
      new TextEncoder().encode(`---
title: Hello
publishedAt: 2026-07-18
draft: false
author:
  name: Oleg
tags: [web, studio]
---
# A body that is not metadata
`).byteLength
    );
  });

  test("stops consuming a stream after the closing delimiter", async () => {
    const returned = vi.fn();
    const source = {
      async *[Symbol.asyncIterator]() {
        try {
          yield new TextEncoder().encode("---\ntitle: Hello\n---\n");
          yield new TextEncoder().encode("body must not be read");
        } finally {
          returned();
        }
      },
    };

    await expect(extractMarkdownFrontmatter(source)).resolves.toMatchObject({
      properties: { title: "Hello" },
    });
    expect(returned).toHaveBeenCalledOnce();
  });

  test("returns empty properties after reading only the opening line", async () => {
    const result = await extractMarkdownFrontmatter("# No frontmatter\nbody");
    expect(result.properties).toEqual({});
    expect(result.consumedBytes).toBeLessThan(20);
  });

  test("parses an explicit empty frontmatter block", async () => {
    await expect(
      extractMarkdownFrontmatter("---\n---\nBody")
    ).resolves.toMatchObject({ properties: {} });
  });

  test("supports a UTF-8 byte order mark and CRLF delimiters", async () => {
    await expect(
      extractMarkdownFrontmatter("\ufeff---\r\ntitle: Hello\r\n---\r\nBody")
    ).resolves.toMatchObject({ properties: { title: "Hello" } });
  });

  test("rejects invalid YAML with a stable error code", async () => {
    await expect(
      extractMarkdownFrontmatter("---\ntitle: [broken\n---\n")
    ).rejects.toMatchObject({
      code: "FRONTMATTER_INVALID",
    } satisfies Partial<MarkdownMetadataError>);
  });

  test("rejects an unclosed block at the byte boundary", async () => {
    await expect(
      extractMarkdownFrontmatter("---\ntitle: too large", { bytes: 8 })
    ).rejects.toMatchObject({
      code: "FRONTMATTER_BYTES_EXCEEDED",
    } satisfies Partial<MarkdownMetadataError>);
  });

  test("rejects a closed block whose properties exceed the byte limit", async () => {
    await expect(
      extractMarkdownFrontmatter(
        `---\ntitle: ${"large".repeat(20)}\n---\nBody`,
        { bytes: 32 }
      )
    ).rejects.toMatchObject({
      code: "FRONTMATTER_BYTES_EXCEEDED",
    } satisfies Partial<MarkdownMetadataError>);
  });

  test("enforces nesting, field, and string limits", async () => {
    await expect(
      extractMarkdownFrontmatter("---\na:\n  b:\n    c: value\n---\n", {
        depth: 2,
      })
    ).rejects.toMatchObject({ code: "FRONTMATTER_DEPTH_EXCEEDED" });
    await expect(
      extractMarkdownFrontmatter("---\na: 1\nb: 2\n---\n", { fields: 1 })
    ).rejects.toMatchObject({ code: "FRONTMATTER_FIELDS_EXCEEDED" });
    await expect(
      extractMarkdownFrontmatter("---\ntitle: long\n---\n", { stringBytes: 3 })
    ).rejects.toMatchObject({ code: "FRONTMATTER_STRING_BYTES_EXCEEDED" });
  });

  test("rejects aliases and duplicate keys", async () => {
    await expect(
      extractMarkdownFrontmatter("---\nbase: &base value\ncopy: *base\n---\n")
    ).rejects.toMatchObject({ code: "FRONTMATTER_INVALID" });
    await expect(
      extractMarkdownFrontmatter("---\ntitle: first\ntitle: second\n---\n")
    ).rejects.toMatchObject({ code: "FRONTMATTER_INVALID" });
  });
});

describe("Markdown body and excerpt extraction", () => {
  test("removes frontmatter while preserving complete Markdown body", async () => {
    const source = "---\ntitle: Hello\n---\n# Heading\n\nBody **text**.";
    const body = "# Heading\n\nBody **text**.";

    await expect(extractMarkdownBody(source)).resolves.toEqual({
      body,
      bodyBytes: new TextEncoder().encode(body).byteLength,
      sourceBytes: new TextEncoder().encode(source).byteLength,
    });
  });

  test("does not treat a later thematic break as frontmatter", async () => {
    await expect(
      extractMarkdownBody("Introduction\n\n---\n\nMore")
    ).resolves.toMatchObject({ body: "Introduction\n\n---\n\nMore" });
  });

  test("enforces the complete-file byte limit before decoding", async () => {
    await expect(extractMarkdownBody("123456", 5)).rejects.toMatchObject({
      code: "MARKDOWN_BODY_BYTES_EXCEEDED",
    });
  });

  test("rejects invalid UTF-8", async () => {
    await expect(
      extractMarkdownBody(new Uint8Array([0xc3, 0x28]))
    ).rejects.toMatchObject({ code: "MARKDOWN_BODY_DECODING_FAILED" });
  });

  test("creates plain-text excerpts without markup or raw HTML", () => {
    expect(
      extractMarkdownExcerpt(
        "# Hello *world*\n\n<div>hidden</div>\n\nUse `code` and [links](https://example.com)."
      )
    ).toBe("Hello world Use code and links.");
  });

  test("truncates excerpts at a valid UTF-8 character boundary", () => {
    expect(extractMarkdownExcerpt("Hello 🌍 world", 10)).toBe("Hello 🌍");
    expect(
      new TextEncoder().encode(extractMarkdownExcerpt("🌍🌍", 5))
    ).toHaveLength(4);
  });

  test("extracts a bounded body and excerpt in one operation", async () => {
    await expect(
      extractMarkdownBodyAndExcerpt(
        "---\ntitle: Hello\n---\n# Heading\n\nLong body text",
        { excerptBytes: 12 }
      )
    ).resolves.toMatchObject({
      body: "# Heading\n\nLong body text",
      excerpt: "Heading Long",
    });
  });

  test("does not allow callers to raise shared limits", async () => {
    await expect(
      extractMarkdownBody("Body", 1024 * 1024 + 1)
    ).rejects.toMatchObject({ code: "MARKDOWN_BODY_BYTES_EXCEEDED" });
    expect(() => extractMarkdownExcerpt("Body", 2049)).toThrowError(
      expect.objectContaining({ code: "MARKDOWN_EXCERPT_BYTES_EXCEEDED" })
    );
  });
});
