import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { $uploadingFilesDataStore } from "~/shared/nano-states";
import { $assets } from "~/shared/sync/data-stores";
import type { AssetContainer } from "./types";
import { useAssets } from "./use-assets";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let renderedAssets: AssetContainer[] = [];

const AssetsProbe = () => {
  renderedAssets = useAssets().assetContainers;
  return null;
};

const renderProbe = () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<AssetsProbe />));
  return () => act(() => root.unmount());
};

afterEach(() => {
  $assets.set(new Map());
  $uploadingFilesDataStore.set([]);
  renderedAssets = [];
});

test("reads current assets when mounted after an in-place store update", () => {
  $assets.set(new Map());
  renderProbe()();

  const asset: Asset = {
    id: "image-id",
    projectId: "project-id",
    type: "image",
    name: "image.png",
    format: "png",
    size: 1,
    meta: { width: 1, height: 1 },
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  $assets.get().set(asset.id, asset);

  const unmount = renderProbe();
  expect(renderedAssets.map(({ asset }) => asset.id)).toEqual([asset.id]);
  unmount();
});
