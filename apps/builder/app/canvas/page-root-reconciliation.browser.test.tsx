import { createElement, useEffect, useRef } from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { getPageRootHostKey } from "./page-root";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const renderAndSwitchPage = async (keyBodyByPage: boolean) => {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  const iframeDocument = iframe.contentDocument;
  if (iframeDocument === null) {
    throw new Error("Iframe document was not created");
  }

  const root = createRoot(iframeDocument);
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
      pageKey === "animated" ? createElement("span", null, "СТВОРЮЮ") : null
    );
  };
  const renderPage = () =>
    createElement(
      "html",
      null,
      createElement("head"),
      createElement(
        "body",
        {
          key: keyBodyByPage
            ? getPageRootHostKey("body", pageId)
            : "stable-body",
        },
        createElement(PageContent, { pageKey: pageId })
      )
    );

  await act(async () => root.render(renderPage()));
  expect(iframeDocument.querySelector("span")).toBeNull();

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
  iframe.remove();
  return switchError;
};

test("reproduces removeChild when the page body reconciles mutated text", async () => {
  const error = await renderAndSwitchPage(false);
  expect((error as DOMException).name).toBe("NotFoundError");
  expect((error as Error).message).toContain(
    "The node to be removed is not a child of this node"
  );
});

test("keying the document body replaces the page without reconciling descendants", async () => {
  await expect(renderAndSwitchPage(true)).resolves.toBeUndefined();
});
