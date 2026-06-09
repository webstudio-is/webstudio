import { expect, test } from "vitest";
import { matchPath as matchRemixPath } from "@remix-run/react";
import { matchPath as matchReactRouterPath } from "react-router";
import { generateRedirectUrl as generateRemixRedirectUrl } from "../templates/defaults/app/redirect-url";
import { generateRedirectUrl as generateReactRouterRedirectUrl } from "../templates/react-router/app/redirect-url";

const implementations = [
  {
    name: "Remix",
    generateRedirectUrl: generateRemixRedirectUrl,
    matchParams: (pattern: string, pathname: string) =>
      matchRemixPath(pattern, pathname)?.params ?? {},
  },
  {
    name: "React Router",
    generateRedirectUrl: generateReactRouterRedirectUrl,
    matchParams: (pattern: string, pathname: string) =>
      matchReactRouterPath(pattern, pathname)?.params ?? {},
  },
] as const;

for (const { name, generateRedirectUrl, matchParams } of implementations) {
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
}
