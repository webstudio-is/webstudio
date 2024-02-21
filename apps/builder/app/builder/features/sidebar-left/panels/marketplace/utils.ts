import { useStore } from "@nanostores/react";
import { atom } from "nanostores";
import { nanoid } from "nanoid";
import type { Category, MarketplaceProduct } from "./types";
import { loadProjectDataById } from "@webstudio-is/http-client";
import {
  extractWebstudioFragment,
  findTargetAndInserFragment,
} from "~/shared/instance-utils";
import { WebstudioIcon } from "@webstudio-is/icons/svg";

const $activeProductId = atom<MarketplaceProduct["id"] | undefined>();

export const products: Array<MarketplaceProduct> = [
  // @todo use the right product
  {
    id: nanoid(),
    category: "sectionTemplates",
    component: "panel",
    label: "Starter Sections",
    url: "http://localhost:3001/copy-1/test",
    authToken: "436191d4-974f-43bb-a878-ea8a51339a9a",
    projectId: "7db43bf6-eecb-48f8-82a7-884506953e1b",
    icon: WebstudioIcon,
  },
];

export const categories: Array<{ category: Category; label: string }> = [
  { category: "sectionTemplates", label: "Section Templates" },
  { category: "apps", label: "Apps" },
];

export const getProductsByCategory = (products: Array<MarketplaceProduct>) => {
  const productsByCategory = new Map<Category, Array<MarketplaceProduct>>();

  for (const product of products) {
    if (
      categories.some((category) => category.category === product.category) ===
      false
    ) {
      throw new Error(`Unknown category: ${product.category}`);
    }
    let categoryItems = productsByCategory.get(product.category);
    if (categoryItems === undefined) {
      categoryItems = [];
      productsByCategory.set(product.category, categoryItems);
    }
    categoryItems.push(product);
  }
  return productsByCategory;
};

export const useActiveProduct = () => {
  const activeProductId = useStore($activeProductId);
  const product = activeProductId
    ? products.find((product) => product.id === activeProductId)
    : undefined;

  return [product, $activeProductId.set] as const;
};

type Action = {
  type: "insert";
  payload: string;
};

export const subscribeActions = (callback: (action: Action) => void) => {
  const onMessage = (event: MessageEvent) => {
    if (event.data.namespace === "MarketplaceItem") {
      callback(event.data);
    }
  };
  addEventListener("message", onMessage, false);

  return () => {
    removeEventListener("message", onMessage, false);
  };
};

export const insert = async ({
  instanceId,
  projectId,
  authToken,
}: {
  instanceId: string;
  projectId: string;
  authToken: string;
}) => {
  const data = await loadProjectDataById({
    projectId,
    authToken,
    origin: location.origin,
  });
  const fragment = extractWebstudioFragment(
    {
      pages: data.build.pages,
      assets: new Map(data.assets.map((asset) => [asset.id, asset])),
      instances: new Map(data.build.instances),
      dataSources: new Map(data.build.dataSources),
      resources: new Map(data.build.resources),
      props: new Map(data.build.props),
      styleSourceSelections: new Map(data.build.styleSourceSelections),
      styleSources: new Map(data.build.styleSources),
      breakpoints: new Map(data.build.breakpoints),
      styles: new Map(data.build.styles),
    },
    instanceId
  );

  findTargetAndInserFragment(fragment);
};
