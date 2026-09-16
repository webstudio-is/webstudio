import { expect, test } from "vitest";
import { resolveHtmlEmbedAssetUrls } from "./html-embed-assets";

const assetUrlsByPath = {
  "/test.js": "/cgi/asset/test_hash.js?format=raw",
  "/site.css": "/cgi/asset/site_hash.css?format=raw",
  "/hero.png": "/cgi/image/hero_hash.png?format=raw",
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

test("does not rewrite markup-like text in comments or raw text elements", () => {
  const code = `<!-- <img src="/hero.png"> -->
<script>const markup = '<img src="/hero.png">'</script>
<style>.hero { background: url('/hero.png') }</style>
<textarea><img src="/hero.png"></textarea>`;

  expect(resolveHtmlEmbedAssetUrls(code, assetUrlsByPath)).toBe(code);
});

test("leaves malformed and unrelated markup unchanged", () => {
  const code = `<div data-src="/hero.png"><img src="/missing.png"></div>`;
  expect(resolveHtmlEmbedAssetUrls(code, assetUrlsByPath)).toBe(code);
  expect(resolveHtmlEmbedAssetUrls(code, undefined)).toBe(code);
});
