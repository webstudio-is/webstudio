/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
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
  createdAt: "2023-10-30T13:51:08.416Z",
  meta: { width: 790, height: 786 },
};

export const socialImageAsset: ImageAsset | undefined = undefined;

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = ({}: { system: any }) => {
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
