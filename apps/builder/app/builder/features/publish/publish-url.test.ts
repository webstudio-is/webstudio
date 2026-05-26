import { describe, expect, test } from "vitest";
import {
  compilePathnamePattern,
  tokenizePathnamePattern,
} from "~/builder/shared/url-pattern";
import { getPublishUrl } from "./publish-url";

describe("getPublishUrl", () => {
  test("uses current page pathname with dynamic params", () => {
    expect(
      getPublishUrl({
        domain: "example.wstd.io",
        pathname: "/blog/my-post",
      }).toString()
    ).toBe("https://example.wstd.io/blog/my-post");
  });

  test("falls back to root when pathname is empty", () => {
    expect(
      getPublishUrl({
        domain: "example.wstd.io",
        pathname: "",
      }).toString()
    ).toBe("https://example.wstd.io/");
  });

  test("falls back to root when dynamic pathname compiles empty", () => {
    const pathname = compilePathnamePattern(
      tokenizePathnamePattern("/:slug?"),
      {}
    );

    expect(
      getPublishUrl({
        domain: "example.wstd.io",
        pathname,
      }).toString()
    ).toBe("https://example.wstd.io/");
  });

  test("adds staging credentials to Webstudio-hosted domains", () => {
    expect(
      getPublishUrl({
        domain: "example.wstd.io",
        pathname: "/blog/my-post",
        username: "user",
        password: "pass",
      }).toString()
    ).toBe("https://user:pass@example.wstd.io/blog/my-post");
  });

  test("does not add credentials when not provided", () => {
    expect(
      getPublishUrl({
        domain: "example.com",
        pathname: "/blog/my-post",
      }).toString()
    ).toBe("https://example.com/blog/my-post");
  });

  test("accepts domains with an explicit protocol", () => {
    expect(
      getPublishUrl({
        domain: "http://localhost:3000",
        pathname: "/preview",
      }).toString()
    ).toBe("http://localhost:3000/preview");
  });
});
