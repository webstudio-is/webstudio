import { useStore } from "@nanostores/react";
import { atom } from "nanostores";
import { nanoid } from "nanoid";
import type { Category, MarketplaceItem } from "./types";

const $activeMarketplaceItemId = atom<MarketplaceItem["id"] | undefined>();

export const items: Array<MarketplaceItem> = [
  {
    id: nanoid(),
    category: "sectionTemplates",
    label: "Basic Sections",
    url: "https://webstudio.is",
  },
  {
    id: nanoid(),
    category: "sectionTemplates",
    label: "Basic Section 2",
    url: "https://webstudio.is",
  },
  {
    id: nanoid(),
    category: "apps",
    label: "My App",
    url: "https://webstudio.is",
    ui: {
      component: "dialog",
      width: 600,
      height: 400,
    },
  },
];

export const categories: Array<{ category: Category; label: string }> = [
  { category: "sectionTemplates", label: "Section Templates" },
  { category: "apps", label: "Apps" },
];

export const getItemsByCategory = (items: Array<MarketplaceItem>) => {
  const itemsByCategory = new Map<Category, Array<MarketplaceItem>>();

  for (const item of items) {
    if (
      categories.some((category) => category.category === item.category) ===
      false
    ) {
      throw new Error(`Unknown category: ${item.category}`);
    }
    let categoryItems = itemsByCategory.get(item.category);
    if (categoryItems === undefined) {
      categoryItems = [];
      itemsByCategory.set(item.category, categoryItems);
    }
    categoryItems.push(item);
  }
  return itemsByCategory;
};

export const useActiveItem = () => {
  const activeMarketplaceItemId = useStore($activeMarketplaceItemId);
  const item = activeMarketplaceItemId
    ? items.find((item) => item.id === activeMarketplaceItemId)
    : undefined;
  return [item, $activeMarketplaceItemId.set] as const;
};
