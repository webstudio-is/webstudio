import { useState } from "react";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import type { ContentCollection } from "~/builder/shared/assets";
import { createAssetManagerTestRenderer } from "~/builder/shared/asset-manager/test-utils";
import {
  CollectionRetryButton,
  CollectionUnavailableNotice,
} from "./collection-unavailable-notice";

const renderer = createAssetManagerTestRenderer();

const configAsset: Asset = {
  id: "config",
  projectId: "project",
  name: "collection.json",
  filename: "collection",
  folderId: "posts",
  type: "file",
  format: "json",
  size: 1,
  createdAt: "2026-09-06T00:00:00.000Z",
  meta: {},
};

const createUnavailableCollection = (): Extract<
  ContentCollection,
  { status: "unavailable" }
> => ({
  status: "unavailable",
  folderId: "posts",
  configAsset,
  reservedAssets: [configAsset],
  siblingAssets: [configAsset],
  message: "Collection files could not be loaded: Request timed out",
});

afterEach(() => {
  renderer.cleanup();
});

test("shows retry progress until collection discovery finishes", () => {
  const onCheckAgain = vi.fn();
  let finishCheck: () => void = () => undefined;
  const Notice = () => {
    const [collection, setCollection] = useState(createUnavailableCollection);
    finishCheck = () => setCollection(createUnavailableCollection());
    return (
      <CollectionUnavailableNotice
        collection={collection}
        onCheckAgain={onCheckAgain}
      />
    );
  };
  renderer.render(<Notice />);

  const alert = document.querySelector<HTMLElement>("[role=alert]");
  expect(alert?.textContent).toContain("Request timed out");
  const retry = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Check again");
  if (retry === undefined) {
    throw new Error("Expected collection retry button");
  }

  act(() => retry.click());

  expect(onCheckAgain).toHaveBeenCalledOnce();
  expect(retry).toBeDisabled();
  expect(retry.textContent).toBe("Checking…");

  act(finishCheck);

  expect(retry).toBeEnabled();
  expect(retry.textContent).toBe("Check again");
});

test("shows the same retry progress for an invalid collection", () => {
  const onCheckAgain = vi.fn();
  let finishCheck: () => void = () => void 0;
  const InvalidRetry = () => {
    const [collection, setCollection] = useState<
      Extract<ContentCollection, { status: "invalid" }>
    >({
      status: "invalid",
      folderId: "posts",
      configAsset,
      reservedAssets: [configAsset],
      siblingAssets: [configAsset],
      repairAsset: configAsset,
      message: "Collection configuration is invalid",
    });
    finishCheck = () =>
      setCollection((current) => ({
        ...current,
        reservedAssets: [...current.reservedAssets],
      }));
    return (
      <CollectionRetryButton
        collection={collection}
        onCheckAgain={onCheckAgain}
      />
    );
  };
  renderer.render(<InvalidRetry />);
  const retry = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Check again");
  if (retry === undefined) {
    throw new Error("Expected collection retry button");
  }

  act(() => retry.click());

  expect(onCheckAgain).toHaveBeenCalledOnce();
  expect(retry).toBeDisabled();
  expect(retry.textContent).toBe("Checking…");

  act(finishCheck);

  expect(retry).toBeEnabled();
  expect(retry.textContent).toBe("Check again");
});
