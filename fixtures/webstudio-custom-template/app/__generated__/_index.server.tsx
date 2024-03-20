/* eslint-disable */
/* This is a auto generated file for building the project */

import type {
  ImageAsset,
  FontAsset,
  ProjectMeta,
  PageMeta,
} from "@webstudio-is/sdk";
import { loadResource, type System } from "@webstudio-is/sdk";
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
    socialImageAssetId: undefined,
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

export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};

export const projectMeta: ProjectMeta = {
  siteName: "Fixture Site",
  faviconAssetId: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
  code: '<script>console.log(\'HELLO\')</script>\n<meta property="saas:test" content="test">',
};

export const imageAssets: ImageAsset[] = [
  {
    id: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
    name: "home_wsKvRSqvkajPPBeycZ-C8.svg",
    description: null,
    projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
    size: 3350,
    type: "image",
    format: "svg",
    createdAt: "2023-10-30T20:35:47.113Z",
    meta: { width: 16, height: 16 },
  },
];

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [
  {
    id: "a8fb692a-5970-4014-ad4d-45c6f1edea36",
    name: "CormorantGaramond-Medium_-nWJ-OtHncaW9xDHQ9hSA_CBl88Oo59QKH_z9pCWva2.woff2",
    description: null,
    projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
    size: 156212,
    type: "font",
    createdAt: "2024-02-22T05:36:52.004Z",
    format: "woff2",
    meta: { family: "Cormorant Garamond", style: "normal", weight: 500 },
  },
];

export const pageBackgroundImageAssets: ImageAsset[] = [
  {
    id: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
    name: "home_wsKvRSqvkajPPBeycZ-C8.svg",
    description: null,
    projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
    size: 3350,
    type: "image",
    format: "svg",
    createdAt: "2023-10-30T20:35:47.113Z",
    meta: { width: 16, height: 16 },
  },
];
