/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-router";

export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const lastPublished = "2026-01-14T01:41:50.130Z";

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
          assets?.data
            ?.cbf6b1b052e52b256cef54a032a546bf43bf3f5441be4d1c5eeaabce26903d78
            ?.url
        }
        className={`w-element`}
      />
    </Body>
  );
};

export { Page };
