import { SYSTEM_FONTS } from "@webstudio-is/fonts";
import { matchSorter } from "match-sorter";
import type { AssetContainer } from "../assets";

export type Item = {
  label: string;
  type: "uploaded" | "system";
  description?: string;
  stack: Array<string>;
};

export const toItems = (
  assetContainers: Array<AssetContainer>
): Array<Item> => {
  // We can have 2+ assets with the same family name, so we use a map to dedupe.
  const uploaded = new Map();
  for (const assetContainer of assetContainers) {
    if (assetContainer.status !== "uploaded") {
      continue;
    }

    const { asset } = assetContainer;
    // @todo need to teach ts the right type from useAssets
    if ("meta" in asset && "family" in asset.meta) {
      uploaded.set(asset.meta.family, {
        label: asset.meta.family,
        type: "uploaded",
      });
    }
  }

  const system = [];
  for (const [label, config] of SYSTEM_FONTS) {
    system.push({
      label,
      type: "system",
      description: config.description,
      stack: config.stack,
    });
  }
  return [...uploaded.values(), ...system];
};

export const filterIdsByFamily = (
  family: string,
  assetContainers: Array<AssetContainer>
) => {
  // One family may have multiple assets for different formats, so we need to find them all.
  return assetContainers
    .filter((assetContainer) => {
      if (assetContainer.status !== "uploaded") {
        return false;
      }
      const { asset } = assetContainer;
      // @todo need to teach TS the right type from useAssets
      return (
        "meta" in asset &&
        "family" in asset.meta &&
        asset.meta.family === family
      );
    })
    .map((assetContainer) => assetContainer.asset!.id);
};

export const groupItemsByType = (items: Array<Item>) => {
  const uploadedItems = items.filter((item) => item.type === "uploaded");
  const systemItems = items.filter((item) => item.type === "system");
  const groupedItems = [...uploadedItems, ...systemItems];
  return { uploadedItems, systemItems, groupedItems };
};

export const filterItems = (search: string, items: Array<Item>) => {
  return matchSorter(items, search, {
    keys: [(item) => item.label],
  });
};
