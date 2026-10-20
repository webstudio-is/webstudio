import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PageSettingsMeta } from "./page-settings-meta";

test("custom Open Graph metadata replaces defaults without removing other custom values", () => {
  const html = renderToStaticMarkup(
    <PageSettingsMeta
      url="https://example.com/article"
      siteName="Example"
      imageLoader={({ src }) => src}
      assetBaseUrl="/assets/"
      pageMeta={{
        title: "Page title",
        description: "Page description",
        socialImageUrl: "https://example.com/default.png",
        custom: [
          { property: "og:type", content: "article" },
          { property: "og:url", content: "https://canonical.example/article" },
          { property: "og:image", content: "https://example.com/first.png" },
          { property: "og:image", content: "https://example.com/second.png" },
        ],
      }}
    />
  );

  expect(html).toContain('property="og:type" content="article"');
  expect(html).not.toContain('property="og:type" content="website"');
  expect(html).toContain(
    'property="og:url" content="https://canonical.example/article"'
  );
  expect(html).not.toContain(
    'property="og:url" content="https://example.com/article"'
  );
  expect(html).not.toContain("default.png");
  expect(html.match(/property="og:image"/g)).toHaveLength(2);
  expect(html).toContain('name="description" content="Page description"');
});
