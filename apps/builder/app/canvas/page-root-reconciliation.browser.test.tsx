import { createElement, useEffect, useRef } from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const renderAndSwitchPage = async (keyRootByPage: boolean) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let pageId = "animated";

  const Page = ({ pageKey }: { pageKey: string }) => {
    const pageRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      // Model canvas content mutating one of its React-owned descendants.
      pageRef.current?.querySelector("span")?.remove();
    }, []);
    return createElement(
      "div",
      { ref: pageRef },
      pageKey === "animated" ? createElement("span", null, "СТВОРЮЮ") : null
    );
  };
  const renderPage = () =>
    createElement(Page, {
      key: keyRootByPage ? pageId : "stable-page-root",
      pageKey: pageId,
    });

  await act(async () => root.render(renderPage()));
  expect(container.querySelector("span")).toBeNull();

  pageId = "plain";
  const switchPage = () => act(() => root.render(renderPage()));
  let switchError: unknown;
  try {
    switchPage();
  } catch (error) {
    switchError = error;
  }

  act(() => root.unmount());
  container.remove();
  return switchError;
};

test("reproduces removeChild when a page mutates a managed node", async () => {
  const error = await renderAndSwitchPage(false);
  expect(error).toBeInstanceOf(DOMException);
  expect((error as Error).message).toContain(
    "The node to be removed is not a child of this node"
  );
});

test("a page-keyed renderer root makes page switching resilient to DOM mutation", async () => {
  await expect(renderAndSwitchPage(true)).resolves.toBeUndefined();
});
