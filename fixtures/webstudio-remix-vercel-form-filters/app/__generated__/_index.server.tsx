/* eslint-disable */
/* This is a auto generated file for building the project */

import type { ProjectMeta, PageMeta } from "@webstudio-is/sdk";
import { loadResource, type System } from "@webstudio-is/sdk";
export const loadResources = async (_props: { system: System }) => {
  const system = _props.system;
  const [Products_1] = await Promise.all([
    loadResource({
      id: "syF2dnDB0TAklidw-9a3Y",
      name: "Products",
      url: "https://api-eu-central-1-shared-euc1-02.hygraph.com/v2/cluazrfa1000008l8gqq87iaq/master",
      method: "post",
      headers: [{ name: "Content-Type", value: "application/json" }],
      body: {
        query: `query Products($where: ProductWhereInput, $currentCategoryWhere:CategoryWhereInput, $locales: [Locale!]!) {
  
  currentCategory: categories(where: $currentCategoryWhere, locales: $locales) {
slug    localizations(includeCurrent: true, locales: [en, de]) {
    	slug
    }
  }
  
    categories(locales: $locales) {
      slug
      name
      localizations(includeCurrent: false, locales: [en, de]) {
     		slug 
      }
    }
    products(locales: $locales,where: $where) {
      description
      id
      slug
      locale
      name
      images(first: 1, where: {}) {
        size
        width
        height
        url(transformation: {image: {resize: {fit: scale, width: 300}}})
      }
    }
  }`,
        variables: {
          locales: [system?.search?.lang ?? "en"],
          currentCategoryWhere: {
            slug: system?.search?.category ?? "",
          },
          where: {
            categories_some: {
              slug: system?.search?.category,
            },
          },
        },
      },
    }),
  ]);
  return {
    Products_1,
  } as Record<string, unknown>;
};

export const getPageMeta = ({
  system,
  resources,
}: {
  system: System;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Home",
    description: undefined,
    excludePageFromSearch: undefined,
    language: undefined,
    socialImageAssetId: undefined,
    socialImageUrl: undefined,
    status: undefined,
    redirect: undefined,
    custom: [],
  };
};

type FormProperties = { method?: string; action?: string };
export const formsProperties = new Map<string, FormProperties>([
  ["Kx8Qljjn_vS4EJlD2ZZz6", { action: "" }],
]);

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const projectId = "edc2a28a-f917-45fd-b320-5c404f36ffef";

export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};

export const projectMeta: ProjectMeta = {};
