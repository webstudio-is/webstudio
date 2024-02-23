/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type {
  Asset,
  FontAsset,
  ImageAsset,
  ProjectMeta,
} from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import type { PageMeta } from "@webstudio-is/react-sdk";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";

import type { PageData } from "~/routes/_index";
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
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

export const pageData: PageData = {
  project: {
    siteName: "Fixture Site",
    faviconAssetId: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
    code: '<script>console.log(\'HELLO\')</script>\n<meta property="saas:test" content="test">',
  },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "0d856812-61d8-4014-a20a-82e01c0eb8ee";

export const getPageMeta = ({
  params,
  resources,
}: {
  params: Record<string, undefined | string>;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Untitled",
    description: "",
    excludePageFromSearch: false,
    socialImageAssetId: undefined,
    socialImageUrl: "",
    status: 200,
    redirect: "",
    custom: [],
  };
};

const Page = ({}: { params: any }) => {
  return <Body data-ws-id="jDb2FuSK2-azIZxkH5XNv" data-ws-component="Body" />;
};

export { Page };

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const pagesPaths = new Set(["", "/script-test", "/world"]);

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
