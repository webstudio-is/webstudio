import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import type { UrlParts } from "@webstudio-is/sdk/link-utils";
import { createLink } from "./create-link";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("page links stay active while section links hydrate with the fragment", async () => {
  let hash = "";
  const RouterLink = forwardRef<
    HTMLAnchorElement,
    ComponentPropsWithoutRef<"a"> & { to: string | Partial<UrlParts> }
  >(({ to, ...props }, ref) => (
    <a
      {...props}
      href={
        typeof to === "string"
          ? to
          : `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`
      }
      ref={ref}
    />
  ));
  const Link = createLink({
    Link: RouterLink,
    useLocation: () => ({ pathname: "/path", search: "", hash }),
    useResolvedPath: (href) => {
      const url = new URL(href, "https://webstudio.local/path");
      return { pathname: url.pathname, search: url.search, hash: url.hash };
    },
  });
  const element = (
    <ReactSdkContext.Provider
      value={{
        assetBaseUrl: "/assets/",
        imageLoader: ({ src }) => src,
        videoLoader: ({ src }) => src,
        resources: {},
        breakpoints: [],
        onError: vi.fn(),
      }}
    >
      <Link href="/path">Page link</Link>
      <Link href="/path#section">Route section link</Link>
      <Link href="#section">Hash link</Link>
    </ReactSdkContext.Provider>
  );
  const container = document.createElement("div");
  container.innerHTML = renderToString(element);
  document.body.append(container);
  expect(
    Array.from(container.querySelectorAll("a"), (link) => link.className)
  ).toEqual(["active", "", ""]);
  expect(
    Array.from(container.querySelectorAll("a"), (link) =>
      link.getAttribute("aria-current")
    )
  ).toEqual(["page", null, null]);

  hash = "#section";
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  let root: Root | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, element);
    });
    expect(consoleError).not.toHaveBeenCalled();
    expect(
      Array.from(container.querySelectorAll("a"), (link) => link.className)
    ).toEqual(["active", "active", "active"]);
    expect(
      Array.from(container.querySelectorAll("a"), (link) =>
        link.getAttribute("aria-current")
      )
    ).toEqual(["page", "page", "page"]);
  } finally {
    await act(async () => root?.unmount());
    consoleError.mockRestore();
    container.remove();
  }
});
