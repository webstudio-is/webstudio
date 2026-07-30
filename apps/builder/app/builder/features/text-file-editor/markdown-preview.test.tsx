import { expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { __testing__ } from "./markdown-preview";

const { renderMarkdownPreview } = __testing__;

const image: Asset = {
  id: "image-id",
  projectId: "project-id",
  type: "image",
  name: "image.png",
  format: "png",
  size: 1,
  meta: { width: 1, height: 1 },
  createdAt: "2026-01-01T00:00:00.000Z",
};

const markdown: Asset = {
  id: "markdown-id",
  projectId: "project-id",
  type: "file",
  name: "post.md",
  format: "md",
  size: 1,
  meta: {},
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("resolves asset IDs and relative paths in Markdown images and links", () => {
  const html = renderMarkdownPreview({
    markdown:
      "![Local image](image-id)\n\n[Relative image](./image.png)\n\n[Download image](image-id)\n\n![Remote image](https://example.com/image.png)",
    sourceAsset: markdown,
    folders: new Map(),
    assetContainers: [{ status: "uploaded", asset: image }],
    origin: "https://builder.example",
  });

  expect(html).toContain(
    'src="https://builder.example/cgi/image/image.png?format=raw"'
  );
  expect(html).toContain(
    'href="https://builder.example/cgi/image/image.png?format=raw"'
  );
  expect(html).toContain('src="https://example.com/image.png"');
});

test("uses an object URL while an inserted image is uploading", () => {
  const html = renderMarkdownPreview({
    markdown: "![Uploading](image-id)",
    sourceAsset: markdown,
    folders: new Map(),
    assetContainers: [
      {
        status: "uploading",
        asset: image,
        objectURL: "blob:https://builder.example/upload",
      },
    ],
    origin: "https://builder.example",
  });

  expect(html).toContain('src="blob:https://builder.example/upload"');
});
