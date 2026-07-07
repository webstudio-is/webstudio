/**
 * Shared test data for router path validation.
 *
 * This file exports test cases that should be used consistently across:
 * 1. Path schema validation (SDK) - page paths, redirect source paths, etc.
 * 2. URLPattern matching (builder) - used for all page routing
 * 3. Route generation for published sites (react-sdk)
 *
 * These paths are used for pages, redirects, and any routable URL.
 * Add new test cases here to ensure all layers are tested with the same data.
 *
 * Reference: React Router path matching tests
 * https://github.com/remix-run/react-router/tree/main/packages/react-router/__tests__
 */

// These test cases define what paths should be valid/invalid across ALL layers

export const VALID_ROUTER_PATHS = {
  // Basic paths
  basic: ["/about", "/blog", "/contact-us", "/products/item-1"],

  // Deep nesting
  deepNesting: [
    "/a/b/c/d/e",
    "/users/123/posts/456/comments/789",
    "/api/v1/resources/items",
  ],

  // Dynamic segments (React Router: /:param)
  dynamicSegments: [
    "/:id",
    "/users/:id",
    "/users/:userId/posts/:postId",
    "/blog/:year/:month/:day/:slug",
    "/courses/:foo-bar", // params can contain dashes
  ],

  // Optional dynamic segments (React Router: /:param?)
  optionalDynamic: [
    "/:lang?/about",
    "/user/:id/:tab?",
    "/:lang?/user/:id?",
    "/docs/:version?/:page?",
    "/nested/:one?/:two?/:three?/:four?", // up to 4 consecutive optionals
    "/:one?/:two?/:three?", // all optional at root
  ],

  // Optional static segments (React Router: /segment?)
  optionalStatic: [
    "/en?/about",
    "/api/v1?/users",
    "/school?/user/:id",
    "/admin?/dashboard",
    "/nested/one?/two?", // consecutive static optionals
    "/nested/one?/two/three?", // intercalated static optionals
  ],

  // Mixed optional patterns (intercalated static and dynamic)
  mixedOptionals: [
    "/nested/:one?/two/:three?", // optional, required, optional
    "/one?/:two?/three/:four/*", // mixed optionals with splat
    "/one/:two?/three/:four?/:five?", // complex mixed pattern
  ],

  // Wildcard/splat routes (React Router: /*)
  wildcards: ["/*", "/blog/*", "/docs/*", "/files/*", "/users/:id/files/*"],

  // Query strings and fragments
  queryAndFragments: [
    "/search?q=test",
    "/page#section",
    "/path?a=1&b=2#top",
    "/products?category=shoes&sort=price",
  ],

  // URL-encoded characters
  urlEncoded: [
    "/hello%20world",
    "/%E6%B8%AF%E8%81%9E",
    "/path%2Fwith%2Fslash",
    "/users%3Fid%3D123", // ?id=123 encoded
  ],

  // Special characters allowed in paths (from React Router special-characters-test.tsx)
  // Note: Some chars have special meaning in URLPattern regex and must be URL-encoded
  specialChars: [
    "/path-with-dash",
    "/path_with_underscore",
    "/path.with.dots",
    "/path~tilde",
    "/path!exclaim",
    "/path@at",
    "/path$dollar",
    "/path'apostrophe",
    "/path,comma",
    "/path;semicolon",
    "/path=equals",
  ],

  // Characters that are valid in URLs but have special meaning in URLPattern
  // These need to be URL-encoded when used literally (not as pattern syntax)
  specialCharsNeedEncoding: [
    "/path%28parens%29", // parentheses encoded
    "/path%2Bplus", // plus encoded
  ],

  // Non-Latin characters (Unicode/UTF-8)
  chinese: ["/关于我们", "/产品/手机", "/港聞", "/繁體中文"],
  japanese: ["/日本語", "/こんにちは", "/カテゴリ", "/ブログ/記事"],
  korean: ["/한국어", "/블로그/포스트", "/서울"],
  cyrillic: ["/привет", "/о-нас", "/блог/статья"],
  arabic: ["/مرحبا", "/عن-الشركة"],
  hebrew: ["/שלום", "/אודות"],
  thai: ["/สวัสดี", "/ภาษาไทย"],
  greek: ["/γεια", "/σχετικά"],
  european: ["/über-uns", "/café", "/niño", "/résumé", "/naïve"],

  // Mixed Latin and non-Latin
  mixed: ["/blog/关于", "/news/港聞", "/category/日本語", "/user/bücherwurm"],

  // File extensions in paths (from React Router generatePath-test.tsx)
  fileExtensions: [
    "/books/:id.json",
    "/api/:resource.xml",
    "/images/:name.png",
    "/docs/:page.html",
    "/sitemap/:lang.xml", // param before extension
    "/:lang.html", // root level param with extension
    "/files/:name.tar.gz", // multiple extensions
    "/:file.min.js", // minified JS pattern
  ],

  // Base64-like segments (from React Router matchRoutes-test.tsx)
  base64Segments: ["/users/VXNlcnM6MQ==", "/items/YWJjZGVm"],

  // Emoji paths (modern Unicode)
  emoji: ["/🏠", "/blog/🎉", "/products/👟"],
} as const;

export const INVALID_ROUTER_PATHS = {
  // Empty or root only (for redirects, root is not a valid source)
  empty: ["", "/"],

  // Spaces (must be URL-encoded for generic page/router paths)
  spaces: ["/hello world", "/path with spaces"],

  // URL-unsafe characters (RFC 3986)
  unsafe: [
    "/path<script>",
    "/path>other",
    '/path"quote',
    "/path{test}",
    "/path|other",
    "/path\\other",
    "/path[0]",
    "/path`backtick",
  ],

  // Reserved paths (Webstudio-specific)
  reserved: ["/s", "/s/css", "/s/uploads", "/build", "/build/main.js"],

  // Invalid structure
  structure: [
    "no-leading-slash",
    "/trailing/",
    "/double//slash",
    "//leading-double",
  ],

  // Control characters
  controlChars: ["/path\x00null", "/path\x1fnewline"],
} as const;

// Flattened arrays for convenience
export const ALL_VALID_PATHS = Object.values(VALID_ROUTER_PATHS).flat();
export const ALL_INVALID_PATHS = Object.values(INVALID_ROUTER_PATHS).flat();

export const REDIRECT_SOURCE_EXTRA_VALID_PATHS = [
  "/hello world",
  "/path with spaces",
  "/path<script>",
  "/path>other",
  '/path"quote',
  "/path{test}",
  "/path|other",
  "/path[0]",
  "/path`backtick",
  "/about/",
  "/about//page",
  "/path?url=https://example.com/a?b=c",
] as const;

export const REDIRECT_SOURCE_VALID_PATHS = [
  ...ALL_VALID_PATHS,
  ...REDIRECT_SOURCE_EXTRA_VALID_PATHS,
] as const;

export const REDIRECT_SOURCE_INVALID_PATHS = [
  ...INVALID_ROUTER_PATHS.empty,
  "/path\\other",
  "/line\nfeed",
  "/tab\tfeed",
  ...INVALID_ROUTER_PATHS.reserved,
  "no-leading-slash",
  "//leading-double",
  ...INVALID_ROUTER_PATHS.controlChars,
] as const;

// Paths that are specifically for testing URLPattern matching (no query/fragment)
// These are paths that work with URLPattern API
export const VALID_URLPATTERN_PATHS = [
  ...VALID_ROUTER_PATHS.basic,
  ...VALID_ROUTER_PATHS.deepNesting,
  ...VALID_ROUTER_PATHS.dynamicSegments,
  ...VALID_ROUTER_PATHS.optionalDynamic,
  // Note: optionalStatic uses React Router syntax which differs from URLPattern
  ...VALID_ROUTER_PATHS.wildcards,
  ...VALID_ROUTER_PATHS.specialChars,
  ...VALID_ROUTER_PATHS.specialCharsNeedEncoding,
  ...VALID_ROUTER_PATHS.chinese,
  ...VALID_ROUTER_PATHS.japanese,
  ...VALID_ROUTER_PATHS.korean,
  ...VALID_ROUTER_PATHS.cyrillic,
  ...VALID_ROUTER_PATHS.arabic,
  ...VALID_ROUTER_PATHS.hebrew,
  ...VALID_ROUTER_PATHS.thai,
  ...VALID_ROUTER_PATHS.greek,
  ...VALID_ROUTER_PATHS.european,
  ...VALID_ROUTER_PATHS.mixed,
  ...VALID_ROUTER_PATHS.base64Segments,
  ...VALID_ROUTER_PATHS.emoji,
] as const;

// Static paths (no wildcards/params) for testing route generation
export const STATIC_PATHS = [
  ...VALID_ROUTER_PATHS.basic,
  ...VALID_ROUTER_PATHS.deepNesting,
  ...VALID_ROUTER_PATHS.specialChars,
  ...VALID_ROUTER_PATHS.specialCharsNeedEncoding,
  ...VALID_ROUTER_PATHS.chinese,
  ...VALID_ROUTER_PATHS.japanese,
  ...VALID_ROUTER_PATHS.korean,
  ...VALID_ROUTER_PATHS.cyrillic,
  ...VALID_ROUTER_PATHS.arabic,
  ...VALID_ROUTER_PATHS.hebrew,
  ...VALID_ROUTER_PATHS.thai,
  ...VALID_ROUTER_PATHS.greek,
  ...VALID_ROUTER_PATHS.european,
  ...VALID_ROUTER_PATHS.mixed,
  ...VALID_ROUTER_PATHS.base64Segments,
  ...VALID_ROUTER_PATHS.emoji,
] as const;

// Pattern paths (with dynamic segments, wildcards, or optional segments)
export const PATTERN_PATHS = [
  ...VALID_ROUTER_PATHS.dynamicSegments,
  ...VALID_ROUTER_PATHS.optionalDynamic,
  ...VALID_ROUTER_PATHS.optionalStatic,
  ...VALID_ROUTER_PATHS.mixedOptionals,
  ...VALID_ROUTER_PATHS.wildcards,
  ...VALID_ROUTER_PATHS.fileExtensions,
] as const;
