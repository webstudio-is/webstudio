/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageMeta } from "@webstudio-is/sdk";
import { loadResource, isLocalResource, type System } from "@webstudio-is/sdk";
export const loadResources = async (_props: { system: System }) => {
  return {} as Record<string, unknown>;
};

export const getPageMeta = ({
  system,
  resources,
}: {
  system: System;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Site Title",
    description: "Page description f511c297-b44f-4e4b-96bd-d013da06bada",
    excludePageFromSearch: undefined,
    language: undefined,
    socialImageAssetId: "ff546bd2-9bb1-4717-a180-1a1fc05565dd",
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

export const projectId = "0d856812-61d8-4014-a20a-82e01c0eb8ee";

export const contactEmail = "hello@webstudio.is";

export const customCode =
  '<script>console.log(\'HELLO\')</script>\n<meta property="saas:test" content="test">';
