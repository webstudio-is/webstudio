import { useState } from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import type { Page, Pages } from "@webstudio-is/sdk";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { HtmlEmbed } from "@webstudio-is/sdk-components-react/components";
import { $selectedPageId } from "~/shared/nano-states/pages";
import { $pages } from "~/shared/sync/data-stores";
import { useCanvasTextDocumentFetch } from "./use-text-document-fetch";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("HtmlEmbed fetch works on entering Preview and native fetch is restored on leaving", async () => {
  const originalFetch = window.fetch;
  const originalPages = $pages.get();
  const originalSelectedPageId = $selectedPageId.get();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const dataPage = {
    id: "data-text",
    name: "Data",
    title: "Data",
    path: "/data.txt",
    rootInstanceId: "data-root",
    meta: {
      documentType: "text" as const,
      content: JSON.stringify(JSON.stringify({ message: "Loaded" })),
    },
  };
  const pages: Pages = {
    homePageId: "home",
    rootFolderId: "root",
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home", "data-text", "data-json"],
        },
      ],
    ]),
    pages: new Map<string, Page>([
      [
        "home",
        {
          id: "home",
          name: "Home",
          title: "Home",
          path: "",
          rootInstanceId: "home-root",
          meta: {},
        },
      ],
      ["data-text", dataPage],
      [
        "data-json",
        {
          ...dataPage,
          id: "data-json",
          path: "/data.json",
        },
      ],
      [
        "docs-page",
        {
          id: "docs-page",
          name: "Docs",
          title: "Docs",
          path: "/docs/page",
          rootInstanceId: "docs-root",
          meta: {},
        },
      ],
      [
        "docs-data",
        {
          ...dataPage,
          id: "docs-data",
          path: "/docs/data.txt",
        },
      ],
    ]),
  };
  pages.folders.get("root")!.children.push("docs-page", "docs-data");
  $pages.set(pages);
  $selectedPageId.set("home");
  let setPreview: (value: boolean) => void = () => {};
  const Preview = () => {
    const [enabled, setEnabled] = useState(false);
    setPreview = setEnabled;
    useCanvasTextDocumentFetch(enabled);
    return enabled ? (
      <ReactSdkContext.Provider
        value={{
          renderer: "preview",
          assetBaseUrl: "",
          imageLoader: ({ src }) => src,
          resources: {},
          breakpoints: [],
          onError: (error) => {
            throw error;
          },
        }}
      >
        <>
          <p id="text-result">Waiting</p>
          <p id="json-result">Waiting</p>
          <HtmlEmbed
            clientOnly
            code={`<script>async function test(path, output) { const response = await fetch(path); const body = await response.text(); output.textContent = path + ' → HTTP ' + response.status; if (response.ok) output.textContent += ' | ' + JSON.parse(body).message; } test('./data.txt', document.getElementById('text-result')).catch(() => { document.getElementById('text-result').textContent = 'Failed'; }); test('./data.json', document.getElementById('json-result')).catch(() => { document.getElementById('json-result').textContent = 'Failed'; });</script>`}
          />
        </>
      </ReactSdkContext.Provider>
    ) : null;
  };
  try {
    await act(async () => root.render(<Preview />));
    expect(window.fetch).toBe(originalFetch);
    for (let index = 0; index < 2; index += 1) {
      await act(async () => setPreview(true));
      await vi.waitFor(() =>
        expect(container.querySelector("#text-result")?.textContent).toBe(
          "./data.txt → HTTP 200 | Loaded"
        )
      );
      expect(container.querySelector("#json-result")?.textContent).toBe(
        "./data.json → HTTP 200 | Loaded"
      );
      expect(window.fetch).not.toBe(originalFetch);
      const previewFetch = window.fetch;
      expect((await window.fetch("./data.txt")).url).toBe(
        new URL("/data.txt", location.href).href
      );
      expect((await window.fetch("./data.json")).url).toBe(
        new URL("/data.json", location.href).href
      );
      $selectedPageId.set("docs-page");
      const nestedResponse = await window.fetch("./data.txt");
      expect(nestedResponse.url).toBe(
        new URL("/docs/data.txt", location.href).href
      );
      expect(nestedResponse.type).toBe("basic");
      expect(nestedResponse.redirected).toBe(false);
      $selectedPageId.set("home");
      $pages.set({
        ...pages,
        pages: new Map(pages.pages).set("data-text", {
          ...dataPage,
          meta: {
            documentType: "text",
            content: JSON.stringify(JSON.stringify({ message: "Updated" })),
          },
        }),
      });
      await expect((await window.fetch("/data.txt")).json()).resolves.toEqual({
        message: "Updated",
      });
      expect(window.fetch).toBe(previewFetch);
      $pages.set(pages);
      await act(async () => setPreview(false));
      expect(window.fetch).toBe(originalFetch);
    }
  } finally {
    await act(async () => root.unmount());
    $pages.set(originalPages);
    $selectedPageId.set(originalSelectedPageId);
    window.fetch = originalFetch;
    container.remove();
  }
});
