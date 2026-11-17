import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { BrowserCurrentUrlProvider } from "./browser-current-url";
import { Link } from "./link";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("static links follow the browser fragment after hydration and navigation", async () => {
  const originalUrl = window.location.href;
  const serverUrl = new URL("/faq", originalUrl).href;
  window.history.replaceState(null, "", `${serverUrl}#one`);
  const element = (
    <ReactSdkContext.Provider
      value={{
        assetBaseUrl: "/assets/",
        imageLoader: ({ src }: { src: string }) => src,
        videoLoader: ({ src }: { src: string }) => src,
        resources: {},
        breakpoints: [],
        onError: vi.fn(),
      }}
    >
      <BrowserCurrentUrlProvider serverUrl={serverUrl}>
        <Link href="/faq">Page</Link>
        <Link href="/faq#one">One</Link>
        <Link href="/faq#two">Two</Link>
      </BrowserCurrentUrlProvider>
    </ReactSdkContext.Provider>
  );
  const container = document.createElement("div");
  container.innerHTML = renderToString(element);
  document.body.append(container);
  const getLinks = () => Array.from(container.querySelectorAll("a"));
  expect(getLinks().map((link) => link.className)).toEqual([
    "active",
    "active",
    "active",
  ]);

  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  let root: Root | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, element);
    });
    expect(consoleError).not.toHaveBeenCalled();
    expect(getLinks().map((link) => link.className)).toEqual([
      "active",
      "active",
      "",
    ]);
    expect(getLinks().map((link) => link.getAttribute("aria-current"))).toEqual(
      ["page", "location", null]
    );

    await act(async () => {
      window.history.replaceState(null, "", `${serverUrl}#two`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(getLinks().map((link) => link.className)).toEqual([
      "active",
      "",
      "active",
    ]);
    expect(getLinks().map((link) => link.getAttribute("aria-current"))).toEqual(
      ["page", null, "location"]
    );
  } finally {
    await act(async () => root?.unmount());
    consoleError.mockRestore();
    container.remove();
    window.history.replaceState(null, "", originalUrl);
  }
});
