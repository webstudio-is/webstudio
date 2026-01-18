/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-router";

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
  let assets = useResource("assets_1");
  return (
    <Body className={`w-element`}>
      <audio
        controls={true}
        src={
          assets?.data?.[
            "2b151fc7b4b0324e6ab78c40f72c7f59273f81fb1be3d08b3f9976428601b95e"
          ]?.url
        }
        className={`w-element`}
      />
      <video
        controls={true}
        src={
          assets?.data?.[
            "4afe692f78ec0530e355a551a3860302c4478037db7b25a3bdae82c32c78634d"
          ]?.url
        }
        className={`w-element`}
      />
    </Body>
  );
};

export { Page };
