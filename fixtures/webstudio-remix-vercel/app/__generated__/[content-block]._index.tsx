/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
import {
  Box as Box,
  Heading as Heading,
  Paragraph as Paragraph,
} from "@webstudio-is/sdk-components-react";

export const siteName = "KittyGuardedZone";

export const favIconAsset: ImageAsset | undefined = {
  id: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
  name: "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png",
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
    <Body className={"w-body"}>
      <Box className={"w-box coklr1z"}>
        <Heading className={"w-heading cc5h0no"}>
          {"Content Block With Templates And Content"}
        </Heading>
        <Heading className={"w-heading"}>{"H1"}</Heading>
        <Paragraph className={"w-paragraph"}>{"Paragraph"}</Paragraph>
      </Box>
      <Box className={"w-box c1cqkpk9"}>
        <Heading className={"w-heading cc5h0no"}>
          {"Content Block With Templates Only"}
        </Heading>
      </Box>
      <Box className={"w-box ccxj65f"}>
        <Heading className={"w-heading cc5h0no"}>{"With Content Only"}</Heading>
        <Heading className={"w-heading"}>{"H1"}</Heading>
        <Paragraph className={"w-paragraph"}>{"Paragraph"}</Paragraph>
      </Box>
      <Box className={"w-box c1a2hnxl"}>
        <Heading className={"w-heading cc5h0no"}>{"Empty"}</Heading>
      </Box>
    </Body>
  );
};

export { Page };
