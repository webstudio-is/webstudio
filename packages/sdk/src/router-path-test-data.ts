/**
 * Shared test data for router path validation.
 *
 * This file exports test cases that should be used consistently across:
 * 1. Path schema validation (SDK) - OldPagePath, page paths, etc.
 * 2. URLPattern matching (builder) - used for all page routing
 * 3. Route generation for published sites (react-sdk)
 *
 * These paths are used for pages, redirects, and any routable URL.
 * Add new test cases here to ensure all layers are tested with the same data.
 */

// These test cases define what paths should be valid/invalid across ALL layers

export const VALID_ROUTER_PATHS = {
  // Basic paths
  basic: ["/about", "/blog", "/contact-us", "/products/item-1"],

  // Patterns (wildcards, params)
  patterns: [
    "/blog/*",
    "/blog/:slug",
    "/blog/:slug?",
    "/posts/:year/:month/*",
    "/:category/:id",
  ],

  // Query strings and fragments
  queryAndFragments: ["/search?q=test", "/page#section", "/path?a=1&b=2#top"],

  // URL-encoded characters
  urlEncoded: ["/hello%20world", "/%E6%B8%AF%E8%81%9E", "/path%2Fwith%2Fslash"],

  // Non-Latin characters (Unicode/UTF-8)
  chinese: ["/关于我们", "/产品/手机", "/港聞", "/繁體中文"],
  japanese: ["/日本語", "/こんにちは", "/カテゴリ", "/ブログ/記事"],
  korean: ["/한국어", "/블로그/포스트", "/서울"],
  cyrillic: ["/привет", "/о-нас", "/блог/статья"],
  arabic: ["/مرحبا", "/عن-الشركة"],
  hebrew: ["/שלום", "/אודות"],
  greek: ["/γεια", "/σχετικά"],
  european: ["/über-uns", "/café", "/niño", "/résumé"],

  // Mixed Latin and non-Latin
  mixed: ["/blog/关于", "/news/港聞", "/category/日本語"],
} as const;

export const INVALID_ROUTER_PATHS = {
  // Empty or root only
  empty: ["", "/"],

  // Spaces (must be URL-encoded)
  spaces: ["/hello world", "/path with spaces"],

  // URL-unsafe characters
  unsafe: [
    "/path<script>",
    "/path>other",
    '/path"quote',
    "/path{test}",
    "/path|other",
    "/path\\other",
    "/path[0]",
  ],

  // Reserved paths
  reserved: ["/s", "/s/css", "/s/uploads", "/build", "/build/main.js"],

  // Invalid structure
  structure: [
    "no-leading-slash",
    "/trailing/",
    "/double//slash",
    "//leading-double",
  ],
} as const;

// Flattened arrays for convenience
export const ALL_VALID_PATHS = Object.values(VALID_ROUTER_PATHS).flat();
export const ALL_INVALID_PATHS = Object.values(INVALID_ROUTER_PATHS).flat();

// Paths that are specifically for testing URLPattern matching (no query/fragment)
export const VALID_URLPATTERN_PATHS = [
  ...VALID_ROUTER_PATHS.basic,
  ...VALID_ROUTER_PATHS.patterns,
  ...VALID_ROUTER_PATHS.chinese,
  ...VALID_ROUTER_PATHS.japanese,
  ...VALID_ROUTER_PATHS.korean,
  ...VALID_ROUTER_PATHS.cyrillic,
  ...VALID_ROUTER_PATHS.arabic,
  ...VALID_ROUTER_PATHS.hebrew,
  ...VALID_ROUTER_PATHS.greek,
  ...VALID_ROUTER_PATHS.european,
  ...VALID_ROUTER_PATHS.mixed,
] as const;

// Static paths (no wildcards/params) for testing route generation
export const STATIC_PATHS = [
  ...VALID_ROUTER_PATHS.basic,
  ...VALID_ROUTER_PATHS.chinese,
  ...VALID_ROUTER_PATHS.japanese,
  ...VALID_ROUTER_PATHS.korean,
  ...VALID_ROUTER_PATHS.cyrillic,
  ...VALID_ROUTER_PATHS.arabic,
  ...VALID_ROUTER_PATHS.hebrew,
  ...VALID_ROUTER_PATHS.greek,
  ...VALID_ROUTER_PATHS.european,
  ...VALID_ROUTER_PATHS.mixed,
] as const;
