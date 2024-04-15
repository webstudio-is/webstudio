/* eslint-disable */
/* This is a auto generated file for building the project */

import type { ProjectMeta, PageMeta } from "@webstudio-is/sdk";
import { loadResource, type System } from "@webstudio-is/sdk";
export const loadResources = async (_props: { system: System }) => {
  const system = _props.system;
  const [Products_1] = await Promise.all([
    loadResource({
      id: "SDTQem4cp91LLzRDrIGMQ",
      name: "Products",
      url: "https://api-eu-central-1-shared-euc1-02.hygraph.com/v2/cluazrfa1000008l8gqq87iaq/master",
      method: "post",
      headers: [{ name: "Content-Type", value: "application/json" }],
      body: {
        query: `
query Product($where: ProductWhereInput, $locales: [Locale!]!) {  
  products(locales: $locales, where: $where) {
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
}
  `,
        variables: {
          locales: [system?.params?.lang ?? "en"],
          where: {
            slug: system?.params?.slug ?? "unisex-long-sleeve-tee",
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
    title: "Untitled",
    description: "",
    excludePageFromSearch: false,
    language: "",
    socialImageAssetId: undefined,
    socialImageUrl: "",
    status: 200,
    redirect: "",
    custom: [],
  };
};

type FormProperties = { method?: string; action?: string };
export const formsProperties = new Map<string, FormProperties>([]);

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const projectId = "edc2a28a-f917-45fd-b320-5c404f36ffef";

export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};

export const projectMeta: ProjectMeta = {};
