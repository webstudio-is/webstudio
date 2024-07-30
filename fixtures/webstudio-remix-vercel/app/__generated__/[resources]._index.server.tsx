/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageMeta } from "@webstudio-is/sdk";
import type { System, ResourceRequest } from "@webstudio-is/sdk";
export const getResources = (_props: { system: System }) => {
  const list_1: ResourceRequest = {
    id: "1vX6SQdaCjJN6MvJlG_cQ",
    name: "list",
    url: "https://gist.githubusercontent.com/TrySound/56507c301ec85669db5f1541406a9259/raw/a49548730ab592c86b9e7781f5b29beec4765494/collection.json",
    method: "get",
    headers: [],
  };
  const _data = new Map<string, ResourceRequest>([["list_1", list_1]]);
  const _action = new Map<string, ResourceRequest>([]);
  return { data: _data, action: _action };
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
    socialImageAssetName: undefined,
    socialImageUrl: undefined,
    status: undefined,
    redirect: undefined,
    custom: [],
  };
};

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const contactEmail = "hello@webstudio.is";
