import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createAssetUrlsByPath } from "@webstudio-is/project-build/runtime";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { type Asset, toRuntimeAsset } from "@webstudio-is/sdk";
import { HtmlEmbed } from "@webstudio-is/sdk-components-react/components";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("resolves an asset-panel path through the Builder SDK context", async () => {
  const script = {
    id: "script",
    projectId: "project",
    name: "test_hash.js",
    filename: "test",
    folderId: "scripts",
    type: "file",
    size: 1,
    format: "js",
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    meta: {},
  } as Asset;
  const assetUrlsByPath = createAssetUrlsByPath({
    assets: [script],
    assetFolders: new Map([
      [
        "scripts",
        {
          id: "scripts",
          projectId: "project",
          name: "Custom scripts",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    ]),
    getUrl: (asset) => toRuntimeAsset(asset, "https://webstudio.local").url,
  });

  await act(async () => {
    root.render(
      <ReactSdkContext.Provider
        value={{
          renderer: "canvas",
          assetBaseUrl: "",
          assetUrlsByPath,
          imageLoader: ({ src }) => src,
          resources: {},
          breakpoints: [],
          onError: (error) => {
            throw error;
          },
        }}
      >
        <HtmlEmbed
          code={'<script src="/Custom scripts/test.js"></script>'}
          $ws$executeScripts={false}
        />
      </ReactSdkContext.Provider>
    );
  });

  expect(assetUrlsByPath).toEqual({
    "/Custom%20scripts/test.js": "/cgi/asset/test_hash.js?format=raw",
  });
  expect(container.querySelector("script")?.getAttribute("src")).toBe(
    "/cgi/asset/test_hash.js?format=raw"
  );
});
