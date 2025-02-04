/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageMeta } from "@webstudio-is/sdk";
import type { System, ResourceRequest } from "@webstudio-is/sdk";
export const getResources = (_props: { system: System }) => {
  const action: ResourceRequest = {
    id: "isNSM3wXcnHFikwNPlEOL",
    name: "action",
    url: "/custom",
    method: "get",
    headers: [],
  };
  const _data = new Map<string, ResourceRequest>([]);
  const _action = new Map<string, ResourceRequest>([["action", action]]);
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
    title: "form",
    description: "",
    excludePageFromSearch: undefined,
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
