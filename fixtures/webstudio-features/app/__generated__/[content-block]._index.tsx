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
      <Box className={`w-box c620822`}>
        <Heading className={`w-heading cc5h0no`}>
          {"Content Block With Templates And Content"}
        </Heading>
        <Heading className={`w-heading`}>{"H1"}</Heading>
        <Paragraph className={`w-paragraph`}>{"Paragraph"}</Paragraph>
      </Box>
      <Box className={`w-box ch21dzk`}>
        <Heading className={`w-heading cc5h0no`}>
          {"Content Block With Templates Only"}
        </Heading>
      </Box>
      <Box className={`w-box c44hi06`}>
        <Heading className={`w-heading cc5h0no`}>{"With Content Only"}</Heading>
        <Heading className={`w-heading`}>{"H1"}</Heading>
        <Paragraph className={`w-paragraph`}>{"Paragraph"}</Paragraph>
      </Box>
      <Box className={`w-box cno1tjk`}>
        <Heading className={`w-heading cc5h0no`}>{"Empty"}</Heading>
      </Box>
    </Body>
  );
};

export { Page };
