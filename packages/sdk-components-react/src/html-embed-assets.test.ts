import { expect, test } from "vitest";
import { resolveHtmlEmbedAssetUrls } from "./html-embed-assets";

const assetUrlsByPath = {
  "/test.js": "/cgi/asset/test_hash.js?format=raw",
  "/site.css": "/cgi/asset/site_hash.css?format=raw",
  "/hero.png": "/cgi/image/hero_hash.png?format=raw",
  "/hero%26": "/cgi/image/hero_ampersand_hash.png?format=raw",
  "/hero%26cover.png": "/cgi/image/hero_cover_hash.png?format=raw",
  "/hero%402x.png": "/cgi/image/hero_2x_hash.png?format=raw",
};

test("rewrites asset attributes without reformatting embed markup", () => {
  const code = `<SCRIPT defer SRC='/test.js#ready'></SCRIPT>
<link href=/site.css rel=stylesheet>
<img alt="Hero > image" src="/hero.png">`;

  expect(resolveHtmlEmbedAssetUrls(code, assetUrlsByPath)).toBe(
    `<SCRIPT defer SRC='/cgi/asset/test_hash.js?format=raw#ready'></SCRIPT>
<link href=/cgi/asset/site_hash.css?format=raw rel=stylesheet>
<img alt="Hero > image" src="/cgi/image/hero_hash.png?format=raw">`
  );
});

test.each([
  ["audio", "src"],
  ["embed", "src"],
  ["img", "src"],
  ["input", "src"],
  ["link", "href"],
  ["object", "data"],
  ["script", "src"],
  ["source", "src"],
  ["track", "src"],
  ["video", "src"],
  ["video", "poster"],
] as const)("rewrites %s[%s] asset references", (tag, attribute) => {
  expect(
    resolveHtmlEmbedAssetUrls(
      `<${tag} ${attribute}="/test.js"></${tag}>`,
      assetUrlsByPath
    )
  ).toBe(`<${tag} ${attribute}="/cgi/asset/test_hash.js?format=raw"></${tag}>`);
});

test("does not rewrite markup-like text in comments or raw text elements", () => {
  const code = `<!-- <img src="/hero.png"> -->
<script>const markup = '</scripture><img src="/hero.png">'</script>
<style>.hero { background: url('/hero.png') }</style>
<textarea><img src="/hero.png"></textarea>`;

  expect(resolveHtmlEmbedAssetUrls(code, assetUrlsByPath)).toBe(code);
});

test("leaves unrelated and missing asset references unchanged", () => {
  const code = `<div data-src="/hero.png"><img src="/missing.png"></div>`;
  expect(resolveHtmlEmbedAssetUrls(code, assetUrlsByPath)).toBe(code);
  expect(resolveHtmlEmbedAssetUrls(code, undefined)).toBe(code);
});

test("decodes character references and canonicalizes asset paths", () => {
  const code = `<script src="/test.js?one=1&amp;two=2"></script>
<img src="/hero&amp;cover.png">
<img src="/hero&amp">`;

  expect(resolveHtmlEmbedAssetUrls(code, assetUrlsByPath)).toBe(
    `<script src="/cgi/asset/test_hash.js?format=raw&one=1&two=2"></script>
<img src="/cgi/image/hero_cover_hash.png?format=raw">
<img src="/cgi/image/hero_ampersand_hash.png?format=raw">`
  );
});

test("rewrites responsive image candidates", () => {
  const code = `<picture>
  <source srcset="/hero.png 1x, /hero@2x.png 2x">
  <img src="/hero.png" srcset="/hero.png 480w, /missing.png 960w">
</picture>`;

  expect(resolveHtmlEmbedAssetUrls(code, assetUrlsByPath)).toBe(`<picture>
  <source srcset="/cgi/image/hero_hash.png?format=raw 1x, /cgi/image/hero_2x_hash.png?format=raw 2x">
  <img src="/cgi/image/hero_hash.png?format=raw" srcset="/cgi/image/hero_hash.png?format=raw 480w, /missing.png 960w">
</picture>`);
});

test("preserves data URLs and resolves descriptorless and malformed srcset candidates", () => {
  const code =
    `<img srcset="data:image/svg+xml,%3Csvg%3E 1x, /hero.png, ` +
    `/hero@2x.png invalid-descriptor">`;

  expect(resolveHtmlEmbedAssetUrls(code, assetUrlsByPath)).toBe(
    `<img srcset="data:image/svg+xml,%3Csvg%3E 1x, ` +
      `/cgi/image/hero_hash.png?format=raw, ` +
      `/cgi/image/hero_2x_hash.png?format=raw invalid-descriptor">`
  );
});
