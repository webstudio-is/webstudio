import { expect, test } from "vitest";
import { matchPath as matchRemixPath } from "@remix-run/react";
import { matchPath as matchReactRouterPath } from "react-router";
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
    matchParams: (pattern: string, pathname: string) =>
      matchRemixPath(pattern, pathname)?.params ?? {},
  },
  {
    name: "React Router",
    generateRedirectUrl: generateReactRouterRedirectUrl,
    matchRedirect: matchReactRouterRedirect,
    matchParams: (pattern: string, pathname: string) =>
      matchReactRouterPath(pattern, pathname)?.params ?? {},
  },
] as const;

for (const {
  name,
  generateRedirectUrl,
  matchRedirect,
  matchParams,
} of implementations) {
  test(`${name}: generates redirect url for /privat/* to /*`, () => {
    const params = matchParams("/privat/*", "/privat/foo");
    expect(params).toEqual({ "*": "foo" });

    expect(generateRedirectUrl("/*", params)).toEqual("/foo");
  });

  test(`${name}: preserves nested splat params`, () => {
    const params = matchParams("/privat/*", "/privat/foo/bar");
    expect(params).toEqual({ "*": "foo/bar" });

    expect(generateRedirectUrl("/*", params)).toEqual("/foo/bar");
  });

  test(`${name}: generates redirect url from named params`, () => {
    const params = matchParams("/blog/:slug", "/blog/post");
    expect(params).toEqual({ slug: "post" });

    expect(generateRedirectUrl("/articles/:slug", params)).toEqual(
      "/articles/post"
    );
  });

  test(`${name}: preserves search and hash`, () => {
    expect(generateRedirectUrl("/*?next=*#section", { "*": "foo" })).toEqual(
      "/foo?next=*#section"
    );
  });

  test(`${name}: preserves non-local urls`, () => {
    expect(
      generateRedirectUrl("https://example.com/*", { "*": "foo" })
    ).toEqual("https://example.com/*");
    expect(generateRedirectUrl("//example.com/*", { "*": "foo" })).toEqual(
      "//example.com/*"
    );
  });

  test(`${name}: matches path-only redirects with or without request query`, () => {
    const redirects = [{ old: "/old", new: "/new", status: 302 }];

    expect(matchRedirect("https://example.com/old", redirects)).toEqual({
      url: "/new",
      status: 302,
    });
    expect(matchRedirect("https://example.com/old?x=1", redirects)).toEqual({
      url: "/new",
      status: 302,
    });
  });

  test(`${name}: matches redirects with exact query strings`, () => {
    const redirects = [
      { old: "/dl.php?filename=file.pdf", new: "/downloads/file.pdf" },
    ];

    expect(
      matchRedirect("https://example.com/dl.php?filename=file.pdf", redirects)
    ).toEqual({
      url: "/downloads/file.pdf",
      status: 301,
    });
    expect(
      matchRedirect("https://example.com/dl.php?filename=other.pdf", redirects)
    ).toBeUndefined();
  });

  test(`${name}: matches encoded and non-Latin paths`, () => {
    const redirects = [
      { old: "/%E6%B8%AF%E8%81%9E", new: "/news" },
      { old: "/über", new: "/ueber" },
      { old: "/path%20with%20spaces", new: "/spaces" },
    ];

    expect(
      matchRedirect("https://example.com/%E6%B8%AF%E8%81%9E", redirects)
    ).toEqual({
      url: "/news",
      status: 301,
    });
    expect(matchRedirect("https://example.com/über", redirects)).toEqual({
      url: "/ueber",
      status: 301,
    });
    expect(
      matchRedirect("https://example.com/path%20with%20spaces", redirects)
    ).toEqual({
      url: "/spaces",
      status: 301,
    });
  });

  test(`${name}: matches query strings containing encoded urls`, () => {
    const redirects = [
      {
        old: "/path?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc",
        new: "/target",
      },
    ];

    expect(
      matchRedirect(
        "https://example.com/path?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc",
        redirects
      )
    ).toEqual({
      url: "/target",
      status: 301,
    });
  });

  test(`${name}: expands dynamic redirect params`, () => {
    expect(
      matchRedirect("https://example.com/blog/post", [
        { old: "/blog/:slug", new: "/articles/:slug", status: "302" },
      ])
    ).toEqual({
      url: "/articles/post",
      status: 302,
    });
  });

  test(`${name}: expands splat redirect params`, () => {
    expect(
      matchRedirect("https://example.com/docs/api/reference", [
        { old: "/docs/*", new: "/reference/*" },
      ])
    ).toEqual({
      url: "/reference/api/reference",
      status: 301,
    });
  });

  test(`${name}: ignores source fragments for matching`, () => {
    expect(
      matchRedirect("https://example.com/old", [
        { old: "/old#section", new: "/new#target" },
      ])
    ).toEqual({
      url: "/new#target",
      status: 301,
    });
  });
}
