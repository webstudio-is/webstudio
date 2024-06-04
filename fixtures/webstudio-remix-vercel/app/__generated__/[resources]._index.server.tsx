/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageMeta } from "@webstudio-is/sdk";
import { loadResource, isLocalResource, type System } from "@webstudio-is/sdk";
import { sitemap } from "./$resources.sitemap.xml";
export const loadResources = async (_props: { system: System }) => {
  const customFetch: typeof fetch = (input, init) => {
    if (typeof input !== "string") {
      return fetch(input, init);
    }

    if (isLocalResource(input, "sitemap.xml")) {
      // @todo: dynamic import sitemap ???
      const response = new Response(JSON.stringify(sitemap));
      response.headers.set("content-type", "application/json; charset=utf-8");
      return Promise.resolve(response);
    }

    return fetch(input, init);
  };
  const [list_1] = await Promise.all([
    loadResource(customFetch, {
      id: "1vX6SQdaCjJN6MvJlG_cQ",
      name: "list",
      url: "https://gist.githubusercontent.com/TrySound/56507c301ec85669db5f1541406a9259/raw/a49548730ab592c86b9e7781f5b29beec4765494/collection.json",
      method: "get",
      headers: [],
    }),
  ]);
  return {
    list_1,
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
    title: "resources",
    description: "",
    excludePageFromSearch: false,
    language: undefined,
    socialImageAssetId: "",
    socialImageUrl: undefined,
    status: undefined,
    redirect: undefined,
    custom: [],
  };
};

type FormProperties = { method?: string; action?: string };
export const formsProperties = new Map<string, FormProperties>([]);

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const contactEmail = "hello@webstudio.is";
