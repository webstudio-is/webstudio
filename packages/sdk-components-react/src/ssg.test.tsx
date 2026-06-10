/**
 * @vitest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { Link, SsgCurrentUrlContext } from "./ssg";

const sdkContext = {
  assetBaseUrl: "/assets/",
  imageLoader: ({ src }: { src: string }) => src,
  videoLoader: ({ src }: { src: string }) => src,
  resources: {},
  breakpoints: [],
  onError: vi.fn(),
};

const renderLinks = (currentUrl: string) => {
  const markup = renderToStaticMarkup(
    <ReactSdkContext.Provider value={sdkContext}>
      <SsgCurrentUrlContext.Provider value={currentUrl}>
        <Link href="/path?tag=bla#section">Exact</Link>
        <Link href="/path">Path only</Link>
        <Link href="/path?tag=bla">Missing hash</Link>
        <Link href="/path?tag=other#section">Different query</Link>
        <Link href="/path#section">Missing query</Link>
        <Link href="#section">Hash only</Link>
        <Link href="#">Bare hash</Link>
        <Link href="?tag=bla#section">Search only</Link>
        <Link href="">Empty</Link>
        <Link href="/path?tag=bla#section" className="custom">
          Active class
        </Link>
        <Link href="/path" className="custom">
          Inactive class
        </Link>
        <Link href="/path?tag=bla#section" aria-current="location">
          Aria override
        </Link>
      </SsgCurrentUrlContext.Provider>
    </ReactSdkContext.Provider>
  );
  document.body.innerHTML = markup;
  return Array.from(document.querySelectorAll("a"));
};

test("local link is current only when pathname, search, and hash match", () => {
  const links = renderLinks("https://example.com/path?tag=bla#section");

  expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([
    "page",
    null,
    null,
    null,
    null,
    "page",
    null,
    "page",
    null,
    "page",
    null,
    "location",
  ]);

  expect(links[0]?.getAttribute("class")).toBe("active");
  expect(links[1]?.hasAttribute("class")).toBe(false);
  expect(links[9]?.getAttribute("class")).toBe("custom active");
  expect(links[10]?.getAttribute("class")).toBe("custom");
});

test("local link preserves exact pathname behavior", () => {
  const markup = renderToStaticMarkup(
    <ReactSdkContext.Provider value={sdkContext}>
      <SsgCurrentUrlContext.Provider value="https://example.com/path/child">
        <Link href="/path">Parent</Link>
        <Link href="/path/child">Child</Link>
        <Link href="/path/">Trailing slash</Link>
        <Link href="/Path/child">Different case</Link>
      </SsgCurrentUrlContext.Provider>
    </ReactSdkContext.Provider>
  );
  document.body.innerHTML = markup;
  const links = Array.from(document.querySelectorAll("a"));

  expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([
    null,
    "page",
    null,
    null,
  ]);
});

test("external and asset links render as plain anchors", () => {
  const markup = renderToStaticMarkup(
    <ReactSdkContext.Provider value={sdkContext}>
      <SsgCurrentUrlContext.Provider value="https://example.com/path">
        <Link
          href="https://example.com/path"
          prefetch="intent"
          preventScrollReset
          reloadDocument
          replace
          target="_blank"
          aria-current="location"
        >
          External
        </Link>
        <Link href="/assets/file.pdf">Asset</Link>
      </SsgCurrentUrlContext.Provider>
    </ReactSdkContext.Provider>
  );
  document.body.innerHTML = markup;
  const links = Array.from(document.querySelectorAll("a"));

  expect(links[0]?.getAttribute("href")).toBe("https://example.com/path");
  expect(links[0]?.getAttribute("target")).toBe("_blank");
  expect(links[0]?.getAttribute("aria-current")).toBe("location");
  expect(links[0]?.hasAttribute("prefetch")).toBe(false);
  expect(links[0]?.hasAttribute("preventscrollreset")).toBe(false);
  expect(links[0]?.hasAttribute("reloaddocument")).toBe(false);
  expect(links[0]?.hasAttribute("replace")).toBe(false);

  expect(links[1]?.getAttribute("href")).toBe("/assets/file.pdf");
  expect(links[1]?.getAttribute("aria-current")).toBeNull();
});

test("invalid absolute href renders as plain anchor", () => {
  const markup = renderToStaticMarkup(
    <ReactSdkContext.Provider value={sdkContext}>
      <SsgCurrentUrlContext.Provider value="https://example.com/path">
        <Link href="http://">Invalid external</Link>
      </SsgCurrentUrlContext.Provider>
    </ReactSdkContext.Provider>
  );
  document.body.innerHTML = markup;
  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("http://");
  expect(link?.getAttribute("aria-current")).toBeNull();
});
