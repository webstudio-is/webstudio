/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
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

export const favIconAsset: string | undefined =
  "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png";

// Font assets on current page (can be preloaded)
export const pageFontAssets: string[] = [];

export const pageBackgroundImageAssets: string[] = [];

const Page = (_props: { system: any }) => {
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
