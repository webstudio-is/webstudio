/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageMeta } from "@webstudio-is/sdk";
import type { System, ResourceRequest } from "@webstudio-is/sdk";
export const getResources = (_props: { system: System }) => {
  const jsonResourceVariable_1: ResourceRequest = {
    id: "fjMzCru8O2U31xY2P1Ovr",
    name: "jsonResourceVariable",
    url: "https://httpbin.org/get?hello=world",
    method: "get",
    headers: [],
  };
  const _data = new Map<string, ResourceRequest>([
    ["jsonResourceVariable_1", jsonResourceVariable_1],
  ]);
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
    status: 200,
    redirect: "",
    custom: [],
  };
};

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const contactEmail = "hello@webstudio.is";
