import { describe, expect, test } from "vitest";
import {
  generateRedirectUrl as generateRemixRedirectUrl,
  matchRedirect as matchRemixRedirect,
} from "../templates/defaults/app/redirect-url";
import {
  generateRedirectUrl as generateReactRouterRedirectUrl,
  matchRedirect as matchReactRouterRedirect,
} from "../templates/react-router/app/redirect-url";

const implementations = [
  {
    name: "Remix",
    generateRedirectUrl: generateRemixRedirectUrl,
    matchRedirect: matchRemixRedirect,
  },
  {
    name: "React Router",
    generateRedirectUrl: generateReactRouterRedirectUrl,
    matchRedirect: matchReactRouterRedirect,
  },
] as const;

const defaultOrigin = "https://example.com";

type Redirect = {
  old: string;
  new: string;
  status?: number | string;
};

type MatchedRedirect = {
  url: string;
  status: number;
};

const url = (path: string) => `${defaultOrigin}${path}`;

for (const { name, generateRedirectUrl, matchRedirect } of implementations) {
  describe(`${name}: generateRedirectUrl`, () => {
    const cases: Array<{
      name: string;
      target: string;
      params: Record<string, string | undefined>;
      expected: string;
    }> = [
      {
        name: "expands splat params",
        target: "/*",
        params: { "*": "foo" },
        expected: "/foo",
      },
      {
        name: "preserves nested splat params",
        target: "/*",
        params: { "*": "foo/bar" },
        expected: "/foo/bar",
      },
      {
        name: "expands named params",
        target: "/articles/:slug",
        params: { slug: "post" },
        expected: "/articles/post",
      },
      {
        name: "preserves search and hash",
        target: "/*?next=*#section",
        params: { "*": "foo" },
        expected: "/foo?next=*#section",
      },
      {
        name: "preserves search on local targets",
        target: "/target?x=1&y=2",
        params: {},
        expected: "/target?x=1&y=2",
      },
      {
        name: "preserves hash on local targets",
        target: "/target#section",
        params: {},
        expected: "/target#section",
      },
      {
        name: "preserves absolute urls",
        target: "https://other.example/*",
        params: { "*": "foo" },
        expected: "https://other.example/*",
      },
      {
        name: "preserves protocol-relative urls",
        target: "//other.example/*",
        params: { "*": "foo" },
        expected: "//other.example/*",
      },
      {
        name: "preserves non-path urls",
        target: "mailto:test@example.com",
        params: {},
        expected: "mailto:test@example.com",
      },
    ];

    test.each(cases)("$name", ({ target, params, expected }) => {
      expect(generateRedirectUrl(target, params)).toEqual(expected);
    });
  });

  describe(`${name}: matchRedirect`, () => {
    const matchingCases: Array<{
      name: string;
      requestPath: string;
      redirects: Redirect[];
      expected: MatchedRedirect;
    }> = [
      {
        name: "matches exact path",
        requestPath: "/old",
        redirects: [{ old: "/old", new: "/new" }],
        expected: { url: "/new", status: 301 },
      },
      {
        name: "path-only source ignores request query",
        requestPath: "/old?x=1",
        redirects: [{ old: "/old", new: "/new", status: 302 }],
        expected: { url: "/new", status: 302 },
      },
      {
        name: "matches exact path with trailing slash",
        requestPath: "/old/",
        redirects: [{ old: "/old/", new: "/new" }],
        expected: { url: "/new", status: 301 },
      },
      {
        name: "matches exact path with repeated slashes",
        requestPath: "/a//b",
        redirects: [{ old: "/a//b", new: "/new" }],
        expected: { url: "/new", status: 301 },
      },
      {
        name: "matches exact query string",
        requestPath: "/old?x=1",
        redirects: [{ old: "/old?x=1", new: "/new" }],
        expected: { url: "/new", status: 301 },
      },
      {
        name: "matches exact empty query value",
        requestPath: "/old?x=",
        redirects: [{ old: "/old?x=", new: "/new" }],
        expected: { url: "/new", status: 301 },
      },
      {
        name: "matches exact repeated query params",
        requestPath: "/old?x=1&x=2",
        redirects: [{ old: "/old?x=1&x=2", new: "/new" }],
        expected: { url: "/new", status: 301 },
      },
      {
        name: "matches exact encoded query values",
        requestPath: "/old?q=a%20b%26c%3Dd",
        redirects: [{ old: "/old?q=a%20b%26c%3Dd", new: "/new" }],
        expected: { url: "/new", status: 301 },
      },
      {
        name: "matches php-style source with query string",
        requestPath: "/dl.php?filename=file.pdf",
        redirects: [
          { old: "/dl.php?filename=file.pdf", new: "/downloads/file.pdf" },
        ],
        expected: { url: "/downloads/file.pdf", status: 301 },
      },
      {
        name: "matches query values containing encoded urls",
        requestPath: "/path?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc",
        redirects: [
          {
            old: "/path?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc",
            new: "/target",
          },
        ],
        expected: { url: "/target", status: 301 },
      },
      {
        name: "matches query values containing unencoded urls",
        requestPath: "/path?url=https://example.com/a?b=c",
        redirects: [
          {
            old: "/path?url=https://example.com/a?b=c",
            new: "/target",
          },
        ],
        expected: { url: "/target", status: 301 },
      },
      {
        name: "matches encoded source pathname",
        requestPath: "/%E6%B8%AF%E8%81%9E",
        redirects: [{ old: "/%E6%B8%AF%E8%81%9E", new: "/news" }],
        expected: { url: "/news", status: 301 },
      },
      {
        name: "matches decoded source against encoded request pathname",
        requestPath: "/%C3%BCber",
        redirects: [{ old: "/über", new: "/ueber" }],
        expected: { url: "/ueber", status: 301 },
      },
      {
        name: "matches encoded source against decoded request pathname",
        requestPath: "/über",
        redirects: [{ old: "/%C3%BCber", new: "/ueber" }],
        expected: { url: "/ueber", status: 301 },
      },
      {
        name: "matches encoded spaces",
        requestPath: "/path%20with%20spaces",
        redirects: [{ old: "/path%20with%20spaces", new: "/spaces" }],
        expected: { url: "/spaces", status: 301 },
      },
      {
        name: "matches decoded spaces against encoded request pathname",
        requestPath: "/path%20with%20spaces",
        redirects: [{ old: "/path with spaces", new: "/spaces" }],
        expected: { url: "/spaces", status: 301 },
      },
      {
        name: "matches browser-encoded angle brackets",
        requestPath: "/path%3Cscript%3E",
        redirects: [{ old: "/path<script>", new: "/encoded" }],
        expected: { url: "/encoded", status: 301 },
      },
      {
        name: "matches browser-encoded quotes",
        requestPath: "/path%22quoted%22",
        redirects: [{ old: '/path"quoted"', new: "/encoded" }],
        expected: { url: "/encoded", status: 301 },
      },
      {
        name: "matches url punctuation in exact paths",
        requestPath: "/!$&'()+,;=@[]",
        redirects: [{ old: "/!$&'()+,;=@[]", new: "/punctuation" }],
        expected: { url: "/punctuation", status: 301 },
      },
      {
        name: "matches literal colon in exact paths",
        requestPath: "/time/12:30",
        redirects: [{ old: "/time/12:30", new: "/time" }],
        expected: { url: "/time", status: 301 },
      },
      {
        name: "matches malformed percent escapes as exact encoded paths",
        requestPath: "/%E0%A4%A",
        redirects: [{ old: "/%E0%A4%A", new: "/malformed-percent" }],
        expected: { url: "/malformed-percent", status: 301 },
      },
      {
        name: "does not decode encoded slash into path separator",
        requestPath: "/file%2Fname",
        redirects: [{ old: "/file%2Fname", new: "/encoded-slash" }],
        expected: { url: "/encoded-slash", status: 301 },
      },
      {
        name: "matches dynamic source and expands target params",
        requestPath: "/blog/post",
        redirects: [
          { old: "/blog/:slug", new: "/articles/:slug", status: "302" },
        ],
        expected: { url: "/articles/post", status: 302 },
      },
      {
        name: "matches encoded dynamic params and keeps encoded target params",
        requestPath: "/blog/%C3%BCber",
        redirects: [{ old: "/blog/:slug", new: "/articles/:slug" }],
        expected: { url: "/articles/%C3%BCber", status: 301 },
      },
      {
        name: "matches splat source and expands target splat",
        requestPath: "/docs/api/reference",
        redirects: [{ old: "/docs/*", new: "/reference/*" }],
        expected: { url: "/reference/api/reference", status: 301 },
      },
      {
        name: "ignores source fragments and preserves target fragments",
        requestPath: "/old",
        redirects: [{ old: "/old#section", new: "/new#target" }],
        expected: { url: "/new#target", status: 301 },
      },
      {
        name: "ignores source fragments after query strings",
        requestPath: "/old?x=1",
        redirects: [{ old: "/old?x=1#section", new: "/new" }],
        expected: { url: "/new", status: 301 },
      },
      {
        name: "falls back to 301 for unsupported status values",
        requestPath: "/old",
        redirects: [{ old: "/old", new: "/new", status: "307" }],
        expected: { url: "/new", status: 301 },
      },
      {
        name: "uses the first matching redirect",
        requestPath: "/old",
        redirects: [
          { old: "/old", new: "/first", status: 302 },
          { old: "/old", new: "/second", status: 301 },
        ],
        expected: { url: "/first", status: 302 },
      },
      {
        name: "query-specific source wins when ordered before path-only source",
        requestPath: "/old?x=1",
        redirects: [
          { old: "/old?x=1", new: "/query" },
          { old: "/old", new: "/path" },
        ],
        expected: { url: "/query", status: 301 },
      },
      {
        name: "path-only source wins when ordered before query-specific source",
        requestPath: "/old?x=1",
        redirects: [
          { old: "/old", new: "/path" },
          { old: "/old?x=1", new: "/query" },
        ],
        expected: { url: "/path", status: 301 },
      },
    ];

    test.each(matchingCases)(
      "$name",
      ({ requestPath, redirects, expected }) => {
        expect(matchRedirect(url(requestPath), redirects)).toEqual(expected);
      }
    );

    const nonMatchingCases: Array<{
      name: string;
      requestPath: string;
      redirects: Redirect[];
    }> = [
      {
        name: "returns undefined when there are no redirects",
        requestPath: "/old",
        redirects: [],
      },
      {
        name: "does not match different paths",
        requestPath: "/other",
        redirects: [{ old: "/old", new: "/new" }],
      },
      {
        name: "does not match nested paths for exact sources",
        requestPath: "/old/nested",
        redirects: [{ old: "/old", new: "/new" }],
      },
      {
        name: "does not normalize trailing slash",
        requestPath: "/old/",
        redirects: [{ old: "/old", new: "/new" }],
      },
      {
        name: "matches paths case-sensitively",
        requestPath: "/path",
        redirects: [{ old: "/Path", new: "/target" }],
      },
      {
        name: "query-specific source does not match missing query",
        requestPath: "/old",
        redirects: [{ old: "/old?x=1", new: "/new" }],
      },
      {
        name: "query-specific source does not match different query",
        requestPath: "/old?x=2",
        redirects: [{ old: "/old?x=1", new: "/new" }],
      },
      {
        name: "query-specific source does not match extra query params",
        requestPath: "/old?x=1&y=2",
        redirects: [{ old: "/old?x=1", new: "/new" }],
      },
      {
        name: "query-specific source does not normalize query param order",
        requestPath: "/old?b=2&a=1",
        redirects: [{ old: "/old?a=1&b=2", new: "/new" }],
      },
      {
        name: "query-specific source does not decode query values",
        requestPath: "/old?q=a+b",
        redirects: [{ old: "/old?q=a%20b", new: "/new" }],
      },
      {
        name: "query-specific source does not ignore empty query values",
        requestPath: "/old?x",
        redirects: [{ old: "/old?x=", new: "/new" }],
      },
      {
        name: "literal colon does not behave like a route param",
        requestPath: "/time/12:45",
        redirects: [{ old: "/time/12:30", new: "/time" }],
      },
      {
        name: "encoded slash does not match real slash",
        requestPath: "/file/name",
        redirects: [{ old: "/file%2Fname", new: "/encoded-slash" }],
      },
      {
        name: "real slash does not match encoded slash",
        requestPath: "/file%2Fname",
        redirects: [{ old: "/file/name", new: "/real-slash" }],
      },
      {
        name: "query-specific redirects do not extract route params",
        requestPath: "/blog/post?preview=1",
        redirects: [{ old: "/blog/:slug?preview=1", new: "/articles/:slug" }],
      },
    ];

    test.each(nonMatchingCases)("$name", ({ requestPath, redirects }) => {
      expect(matchRedirect(url(requestPath), redirects)).toBeUndefined();
    });
  });
}
