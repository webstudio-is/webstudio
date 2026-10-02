import { createElement, useEffect, useRef } from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { PageRoot } from "./page-root";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const renderAndSwitchPage = async (keyPageBoundary: boolean) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let pageId = "animated";

  const PageContent = ({ pageKey }: { pageKey: string }) => {
    const pageRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      // Model canvas content mutating a React-managed descendant.
      pageRef.current?.querySelector("span")?.remove();
    }, []);
    return createElement(
      "div",
      { ref: pageRef },
      createElement(
        "div",
        null,
        pageKey === "animated" ? createElement("span", null, "СТВОРЮЮ") : null
      )
    );
  };
  const renderPage = () =>
    createElement(PageRoot, {
      pageKey: keyPageBoundary ? pageId : "stable-page-boundary",
      children: createElement(PageContent, { pageKey: pageId }),
    });

  await act(async () => root.render(renderPage()));
  expect(container.querySelector("span")).toBeNull();

  pageId = "plain";
  let switchError: unknown;
  try {
    await act(async () => root.render(renderPage()));
  } catch (error) {
    switchError = error;
  }

  try {
    act(() => root.unmount());
  } catch {}
  container.remove();
  return switchError;
};

test("reproduces removeChild when page reconciliation reaches mutated text", async () => {
  const error = await renderAndSwitchPage(false);
  expect(error).toBeInstanceOf(DOMException);
  expect((error as Error).message).toContain(
    "The node to be removed is not a child of this node"
  );
});

test("a keyed host boundary replaces the previous page without reconciling descendants", async () => {
  await expect(renderAndSwitchPage(true)).resolves.toBeUndefined();
});
