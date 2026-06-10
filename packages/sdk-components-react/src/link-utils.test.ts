import { expect, test } from "vitest";
import {
  isLocalHref,
  isLocalLinkActive,
  resolveLocalLinkUrl,
} from "./link-utils";

test("href is local unless it is absolute, protocol-relative, or an asset", () => {
  expect(isLocalHref("/path", "/assets/")).toBe(true);
  expect(isLocalHref("?tag=bla", "/assets/")).toBe(true);
  expect(isLocalHref("#section", "/assets/")).toBe(true);
  expect(isLocalHref("", "/assets/")).toBe(true);

  expect(isLocalHref("https://example.com/path", "/assets/")).toBe(false);
  expect(isLocalHref("//example.com/path", "/assets/")).toBe(false);
  expect(isLocalHref("mailto:hello@example.com", "/assets/")).toBe(false);
  expect(isLocalHref("/assets/file.pdf", "/assets/")).toBe(false);
});

test("asset base url only excludes matching root-relative asset paths", () => {
  expect(isLocalHref("/assets", "/assets/")).toBe(true);
  expect(isLocalHref("/assets2/file.pdf", "/assets/")).toBe(true);
});

test("local link matches exact pathname, search, and hash", () => {
  expect(
    isLocalLinkActive(
      { pathname: "/path", search: "?tag=bla", hash: "#section" },
      { pathname: "/path", search: "?tag=bla", hash: "#section" }
    )
  ).toBe(true);
});

test("local link does not match when pathname, search, or hash differ", () => {
  const current = { pathname: "/path", search: "?tag=bla", hash: "#section" };

  expect(
    isLocalLinkActive(current, {
      pathname: "/path/child",
      search: "?tag=bla",
      hash: "#section",
    })
  ).toBe(false);
  expect(
    isLocalLinkActive(current, {
      pathname: "/path",
      search: "?tag=other",
      hash: "#section",
    })
  ).toBe(false);
  expect(
    isLocalLinkActive(current, {
      pathname: "/path",
      search: "?tag=bla",
      hash: "#other",
    })
  ).toBe(false);
});

test("local link matching is case-sensitive like concrete URLs", () => {
  expect(
    isLocalLinkActive(
      { pathname: "/Path", search: "?Tag=bla", hash: "#Section" },
      { pathname: "/path", search: "?tag=bla", hash: "#section" }
    )
  ).toBe(false);
});

test("local link matching preserves trailing slash exactness", () => {
  expect(
    isLocalLinkActive(
      { pathname: "/path/", search: "", hash: "" },
      { pathname: "/path", search: "", hash: "" }
    )
  ).toBe(false);
});

test("empty local link resolves to current pathname and search without hash", () => {
  const current = { pathname: "/path", search: "?tag=bla", hash: "#section" };

  expect(
    resolveLocalLinkUrl("", current, {
      pathname: "/path",
      search: "",
      hash: "",
    })
  ).toEqual({
    pathname: "/path",
    search: "?tag=bla",
    hash: "",
  });
});

test("hash local link resolves against current pathname and search", () => {
  const current = { pathname: "/path", search: "?tag=bla", hash: "" };

  expect(
    resolveLocalLinkUrl("#section", current, {
      pathname: "/other",
      search: "?tag=other",
      hash: "#section",
    })
  ).toEqual({
    pathname: "/path",
    search: "?tag=bla",
    hash: "#section",
  });
});

test("bare hash local link resolves to current pathname and search without hash", () => {
  const current = { pathname: "/path", search: "?tag=bla", hash: "#section" };

  expect(
    resolveLocalLinkUrl("#", current, {
      pathname: "/other",
      search: "?tag=other",
      hash: "#section",
    })
  ).toEqual({
    pathname: "/path",
    search: "?tag=bla",
    hash: "",
  });
});

test("path local link uses router resolved path", () => {
  const resolvedPath = {
    pathname: "/resolved",
    search: "?tag=bla",
    hash: "#section",
  };

  expect(
    resolveLocalLinkUrl(
      "/resolved?tag=bla#section",
      { pathname: "/path", search: "", hash: "" },
      resolvedPath
    )
  ).toBe(resolvedPath);
});
