/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-router";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
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
  let list = useResource("list_1");
  return (
    <Body className={`w-body`}>
      {Object.entries(
        // @ts-ignore
        list?.data ?? {}
      ).map(([_key, collectionItem]: any) => {
        const index = Array.isArray(list?.data) ? Number(_key) : _key;
        return (
          <Fragment key={index}>
            <Box className={`w-box`}>
              <HtmlEmbed
                code={collectionItem?.name}
                className={`w-html-embed`}
              />
            </Box>
          </Fragment>
        );
      })}
    </Body>
  );
};

export { Page };
