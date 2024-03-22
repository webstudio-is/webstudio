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
export const imageAssets: ImageAsset[] = [];

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

export const pageData: PageData = { project: {} };
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "622a2a82-59b2-44ea-abfe-5c02cc93b771";

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
    language: "",
    socialImageAssetId: undefined,
    socialImageUrl: "",
    status: 200,
    redirect: "",
    custom: [],
  };
};

const Page = ({}: { params: any }) => {
  return <Body data-ws-id="_l4bGUCK0eHbg-ZcXXT2V" data-ws-component="Body" />;
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
