/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import {
  Body as Body,
  Link as Link,
} from "@webstudio-is/sdk-components-react-router";
import {
  HeadSlot as HeadSlot,
  HeadLink as HeadLink,
  HeadMeta as HeadMeta,
  Heading as Heading,
  HeadTitle as HeadTitle,
} from "@webstudio-is/sdk-components-react";

export const siteName = "KittyGuardedZone";

export const favIconAsset: ImageAsset | undefined = {
  id: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
  name: "DALL_E_2023-10-30_12.39.46_-_Photo_with_bold_cat_silhouette_centered_on_contrasting_background_32x32_favicon_res_00h6cEA8u2pJRvVJv7hRe.png",
  description: null,
  projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
  size: 268326,
  type: "image",
  format: "png",
  createdAt: "2023-10-30T13:51:08.416+00:00",
  meta: { width: 790, height: 786 },
};

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = ({}: { system: any }) => {
  return (
    <Body className={`w-body`}>
      <HeadSlot>
        <HeadTitle>{"Head Slot Title"}</HeadTitle>
        <HeadLink rel={"help"} href={"/help-head-slot"} />
        <HeadMeta name={"keywords"} content={"Head Slot Content"} />
        <HeadMeta content={"Head Slot Content"} property={"og:title"} />
        <HeadLink
          rel={"canonical"}
          href={"https://overwritten.slot/head-slot-tag"}
        />
      </HeadSlot>
      <Heading className={`w-heading`}>{"Test Head Slot"}</Heading>
      <Link href={"/"} className={`w-link`}>
        {"Go Home"}
      </Link>
    </Body>
  );
};

export { Page };
