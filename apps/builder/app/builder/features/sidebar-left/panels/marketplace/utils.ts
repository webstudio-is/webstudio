import { useStore } from "@nanostores/react";
import { atom } from "nanostores";
import { nanoid } from "nanoid";
import type { MarketplaceProduct } from "./types";
import { loadProjectDataById, type Data } from "@webstudio-is/http-client";
import {
  extractWebstudioFragment,
  findTargetAndInserFragment,
} from "~/shared/instance-utils";
import type { WebstudioData } from "@webstudio-is/sdk";

const $activeProductId = atom<MarketplaceProduct["id"] | undefined>();

export const $activeProductData = atom<WebstudioData | undefined>();

export const products: Array<MarketplaceProduct> = [
  // @todo use the right product, find a better place for this initial list
  {
    id: nanoid(),
    category: "templates",
    label: "Starter Sections",
    url: "http://localhost:3000",
    authToken: "436191d4-974f-43bb-a878-ea8a51339a9a",
    projectId: "7db43bf6-eecb-48f8-82a7-884506953e1b",
  },
];

export const categories: Array<{
  category: MarketplaceProduct["category"];
  label: string;
}> = [
  { category: "templates", label: "Templates" },
  { category: "apps", label: "Apps" },
];

export const getProductsByCategory = (products: Array<MarketplaceProduct>) => {
  const productsByCategory = new Map<
    MarketplaceProduct["category"],
    Array<MarketplaceProduct>
  >();

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

  const setActiveProduct = async (id?: MarketplaceProduct["id"]) => {
    $activeProductId.set(id);
    const product = products.find((product) => product.id === id);
    if (product === undefined || id === undefined) {
      return;
    }
    let webstudioData;
    try {
      const data = await loadProjectDataById({
        projectId: product.projectId,
        authToken: product.authToken,
        origin: location.origin,
      });
      webstudioData = toWebstudioData(data);
    } catch (error) {
      // @todo what should happen if there is an error?
      console.error(error);
    }
    $activeProductData.set(webstudioData);
  };
  return [product, setActiveProduct] as const;
};

const toWebstudioData = (data: Data): WebstudioData => ({
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
});

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

/**
 * Insert page as a template.
 * - Currently only supports inserting everything from the body
 * - Could be extended to support children of some other instance e.g. Marketplace Item
 */
export const insert = async ({
  instanceId,
  data,
}: {
  instanceId: string;
  data: WebstudioData;
}) => {
  const fragment = extractWebstudioFragment(data, instanceId);
  fragment.instances = fragment.instances.filter(
    (instance) => instance.component !== "Body"
  );
  findTargetAndInserFragment(fragment);
};
