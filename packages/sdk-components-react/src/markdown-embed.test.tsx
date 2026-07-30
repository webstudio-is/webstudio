import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { MarkdownEmbed } from "./markdown-embed";

describe("MarkdownEmbed", () => {
  test("adds stable unique IDs to ATX and setext headings", () => {
    const html = renderToStaticMarkup(
      <MarkdownEmbed
        code={`
# Hello, world!

Hello, world!
-------------

## **Formatted** heading

## 你好

## 😀
      `}
      />
    );

    expect(html).toContain('<h1 id="hello-world">Hello, world!</h1>');
    expect(html).toContain('<h2 id="hello-world-1">Hello, world!</h2>');
    expect(html).toContain(
      '<h2 id="formatted-heading"><strong>Formatted</strong> heading</h2>'
    );
    expect(html).toContain('<h2 id="你好">你好</h2>');
    expect(html).toContain('<h2 id="heading">😀</h2>');
  });

  test("renders safe embeds and removes executable HTML", () => {
    const html = renderToStaticMarkup(
      <MarkdownEmbed
        code={`
<figure class="video">
  <iframe src="https://player.vimeo.com/video/123" title="Demo" allowfullscreen></iframe>
  <figcaption>Demo video</figcaption>
</figure>
<script>alert("unsafe")</script>
<img src="javascript:alert('unsafe')" onerror="alert('unsafe')">
<a href="javascript:alert('unsafe')">Unsafe link</a>
<iframe src="data:text/html,unsafe" srcdoc="<script>alert('unsafe')</script>"></iframe>
<img src="blob:https://example.com/unsafe">
<input type="text" value="unsafe">

![Safe image](https://example.com/image.png)
        `}
      />
    );

    expect(html).toContain('<figure class="video">');
    expect(html).toContain(
      '<iframe src="https://player.vimeo.com/video/123" title="Demo" allowfullscreen></iframe>'
    );
    expect(html).toContain("<figcaption>Demo video</figcaption>");
    expect(html).toContain(
      '<img src="https://example.com/image.png" alt="Safe image" />'
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("srcdoc");
    expect(html).not.toContain("data:text/html");
    expect(html).not.toContain("blob:");
    expect(html).not.toContain('type="text"');
  });

  test("renders the complete GFM dialect", () => {
    const html = renderToStaticMarkup(
      <MarkdownEmbed
        code={`~~done~~\n\n- [x] Published\n\nhttps://example.com\n\n| A | B |\n| - | - |\n| 1 | 2 |`}
      />
    );

    expect(html).toContain("<del>done</del>");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('<a href="https://example.com">');
    expect(html).toContain("<table>");
  });

  test("does not render YAML frontmatter or treat it as a heading", () => {
    const html = renderToStaticMarkup(
      <MarkdownEmbed code={`---\ntitle: Hidden\n---\n# Visible`} />
    );

    expect(html).toContain('<h1 id="visible">Visible</h1>');
    expect(html).not.toContain("title: Hidden");
  });
});
