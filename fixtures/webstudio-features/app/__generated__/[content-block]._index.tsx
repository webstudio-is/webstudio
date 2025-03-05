/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-router";
import {
  Box as Box,
  Heading as Heading,
  Paragraph as Paragraph,
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
      <Box className={`w-box coklr1z`}>
        <Heading className={`w-heading cc5h0no`}>
          {"Content Block With Templates And Content"}
        </Heading>
        <Heading className={`w-heading`}>{"H1"}</Heading>
        <Paragraph className={`w-paragraph`}>{"Paragraph"}</Paragraph>
      </Box>
      <Box className={`w-box c1cqkpk9`}>
        <Heading className={`w-heading cc5h0no`}>
          {"Content Block With Templates Only"}
        </Heading>
      </Box>
      <Box className={`w-box ccxj65f`}>
        <Heading className={`w-heading cc5h0no`}>{"With Content Only"}</Heading>
        <Heading className={`w-heading`}>{"H1"}</Heading>
        <Paragraph className={`w-paragraph`}>{"Paragraph"}</Paragraph>
      </Box>
      <Box className={`w-box c1a2hnxl`}>
        <Heading className={`w-heading cc5h0no`}>{"Empty"}</Heading>
      </Box>
    </Body>
  );
};

export { Page };
