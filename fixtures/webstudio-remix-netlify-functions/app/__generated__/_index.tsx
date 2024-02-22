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
import {
  Heading as Heading,
  Text as Text,
} from "@webstudio-is/sdk-components-react";

import type { PageData } from "~/routes/_index";
export const imageAssets: ImageAsset[] = [];

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

export const pageData: PageData = {
  project: { siteName: "", faviconAssetId: "", code: "" },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "d845c167-ea07-4875-b08d-83e97c09dcce";

export const getPageMeta = ({
  params,
  resources,
}: {
  params: Record<string, undefined | string>;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Home",
    description: undefined,
    excludePageFromSearch: undefined,
    socialImageAssetId: undefined,
    socialImageUrl: undefined,
    status: undefined,
    redirect: undefined,
    custom: [],
  };
};

const Page = ({}: { params: any }) => {
  return (
    <Body
      data-ws-id="MMimeobf_zi4ZkRGXapju"
      data-ws-component="Body"
      className="c9ryj1f c1e3go07 cmhckny cr0vgwe"
    >
      <Heading data-ws-id="MYDt0guk1-vzc7yzqyN6A" data-ws-component="Heading">
        {"Simple Project to test CLI"}
      </Heading>
      <Text data-ws-id="BMJfjOzunWs8XkQgvvx1e" data-ws-component="Text">
        {"Please don't change directly in the fixture"}
      </Text>
    </Body>
  );
};

export { Page };

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const pagesPaths = new Set([""]);

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
