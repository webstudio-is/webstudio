/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageMeta } from "@webstudio-is/sdk";
import type { System, ResourceRequest } from "@webstudio-is/sdk";
export const getResources = (_props: { system: System }) => {
  const assets_1: ResourceRequest = {
    name: "assets",
    url: "/$resources/assets",
    searchParams: [],
    method: "get",
    headers: [],
  };
  const _data = new Map<string, ResourceRequest>([["assets_1", assets_1]]);
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
    title: "Untitled",
    description: "",
    excludePageFromSearch: true,
    language: "",
    socialImageAssetName: undefined,
    socialImageUrl: "",
    status: undefined,
    redirect: "",
    custom: [],
  };
};

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const contactEmail = "hello@webstudio.is";
