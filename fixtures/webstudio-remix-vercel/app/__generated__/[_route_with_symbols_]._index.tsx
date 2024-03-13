/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type {
  Asset,
  FontAsset,
  ImageAsset,
  ProjectMeta,
  System,
} from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import type { PageMeta } from "@webstudio-is/react-sdk";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
import { Image as Image } from "@webstudio-is/sdk-components-react";

import type { PageData } from "~/routes/_index";
export const imageAssets: ImageAsset[] = [
  {
    id: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
    name: "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png",
    description: null,
    projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
    size: 268326,
    type: "image",
    format: "png",
    createdAt: "2023-10-30T13:51:08.416Z",
    meta: { width: 790, height: 786 },
  },
  {
    id: "9a8bc926-7804-4d3f-af81-69196b1d2ed8",
    name: "small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp",
    description: null,
    projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
    size: 2906,
    type: "image",
    format: "webp",
    createdAt: "2023-09-12T09:44:22.120Z",
    meta: { width: 100, height: 100 },
  },
  {
    id: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
    name: "_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg",
    description: null,
    projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
    size: 210614,
    type: "image",
    format: "jpeg",
    createdAt: "2023-09-06T11:28:43.031Z",
    meta: { width: 1024, height: 1024 },
  },
];

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

export const pageData: PageData = {
  project: {
    siteName: "KittyGuardedZone",
    faviconAssetId: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
    code: "<script>console.log('KittyGuardedZone')</script>\n",
  },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const getPageMeta = ({
  system,
  resources,
}: {
  system: System;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "RouteWithSymbols",
    description: "",
    excludePageFromSearch: undefined,
    language: undefined,
    socialImageAssetId: undefined,
    socialImageUrl: undefined,
    status: undefined,
    redirect: undefined,
    custom: [],
  };
};

const Page = ({}: { system: any }) => {
  return (
    <Body data-ws-id="EDEfpMPRqDejthtwkH7ws" data-ws-component="Body">
      <Image
        data-ws-id="AdXSAYCx4QDo5QN6nLoGs"
        data-ws-component="Image"
        src={"/assets/small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp"}
        className="c1arp7pb"
      />
    </Body>
  );
};

export { Page };

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
