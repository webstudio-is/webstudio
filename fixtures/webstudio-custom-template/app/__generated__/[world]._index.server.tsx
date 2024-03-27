/* eslint-disable */
/* This is a auto generated file for building the project */

import type { ImageAsset, ProjectMeta, PageMeta } from "@webstudio-is/sdk";
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
    title: "Untitled",
    description: "",
    excludePageFromSearch: false,
    language: "ru",
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
    id: "ff546bd2-9bb1-4717-a180-1a1fc05565dd",
    name: "_937084ed-a798-49fe-8664-df93a2af605e_1JqSy_0Wy9fY5mXNZSLJ0.jpeg",
    description: null,
    projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
    size: 210614,
    type: "image",
    format: "jpg",
    createdAt: "2024-03-26T18:31:04.086Z",
    meta: { width: 1024, height: 1024 },
  },
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
