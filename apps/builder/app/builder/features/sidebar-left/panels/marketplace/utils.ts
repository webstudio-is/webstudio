import { useStore } from "@nanostores/react";
import { atom } from "nanostores";
import { nanoid } from "nanoid";
import type { Category, MarketplaceProduct } from "./types";

const $activeMarketplaceItemId = atom<MarketplaceProduct["id"] | undefined>();

export const items: Array<MarketplaceProduct> = [
  {
    id: nanoid(),
    category: "sectionTemplates",
    label: "Basic Sections",
    url: "http://localhost:3001/copy-1/test",
    authToken: "436191d4-974f-43bb-a878-ea8a51339a9a",
    projectId: "7db43bf6-eecb-48f8-82a7-884506953e1b",
  },
];

export const categories: Array<{ category: Category; label: string }> = [
  { category: "sectionTemplates", label: "Section Templates" },
  { category: "apps", label: "Apps" },
];

export const getItemsByCategory = (items: Array<MarketplaceProduct>) => {
  const itemsByCategory = new Map<Category, Array<MarketplaceProduct>>();

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
