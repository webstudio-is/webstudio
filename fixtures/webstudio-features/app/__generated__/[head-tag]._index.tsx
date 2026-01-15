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

export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const lastPublished = "2026-01-15T16:19:55.574Z";

export const siteName = "KittyGuardedZone";

export const breakpoints = [
  { id: "UoTkWyaFuTYJihS3MFYK5" },
  { id: "ZMaWCtWpH-ao0e_kgIHqR", minWidth: 372 },
  { id: "Z8WjyXWkCrr35PXgjHdpY", minWidth: 472 },
];

export const favIconAsset: string | undefined =
  "cat_silhouette_BDpTbUFSpVbfUWQZNxbBG.png";

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
