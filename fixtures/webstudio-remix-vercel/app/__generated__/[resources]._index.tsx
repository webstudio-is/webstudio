/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { Asset, ImageAsset, ProjectMeta } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import type { PageMeta } from "@webstudio-is/react-sdk";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react";

import type { PageData } from "~/routes/_index";
export const fontAssets: Asset[] = [];
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

export const getPageMeta = ({}: {
  params: Record<string, undefined | string>;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "resources",
    description: "",
    excludePageFromSearch: false,
    socialImageAssetId: "",
    custom: [],
  };
};

const Page = ({ params: PageParams }: { params: any }) => {
  let list = useResource("list_1");
  return (
    <Body data-ws-id="AWY2qZfpbykoiWELeJhse" data-ws-component="Body">
      {list?.data?.map((collectionItem: any, index: number) => (
        <Fragment key={index}>
          <Box data-ws-id="-F-b3eIEZ8WKW_F-Aw8nN" data-ws-component="Box">
            <HtmlEmbed
              data-ws-id="05oK4Ks0ocFv3w8MJOcNR"
              data-ws-component="HtmlEmbed"
              code={collectionItem?.name}
            />
          </Box>
        </Fragment>
      ))}
    </Body>
  );
};

export { Page };

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const pagesPaths = new Set([
  "",
  "/radix",
  "/_route_with_symbols_",
  "/form",
  "/heading-with-id",
  "/resources",
  "/nested/nested-page",
]);

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
