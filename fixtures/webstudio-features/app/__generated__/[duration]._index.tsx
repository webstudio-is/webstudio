/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-router";
import { AnimateChildren as AnimateChildren } from "@webstudio-is/sdk-components-animation";
import { Heading as Heading } from "@webstudio-is/sdk-components-react";

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
      <AnimateChildren
        action={{
          type: "view",
          animations: [
            {
              name: "Parent",
              description: "Parallax the element as it scrolls into the view.",
              keyframes: [
                {
                  offset: 0,
                  styles: {
                    translate: {
                      type: "tuple",
                      value: [
                        { type: "unit", unit: "number", value: 0 },
                        { type: "unit", unit: "px", value: 100 },
                      ],
                    },
                  },
                },
              ],
              timing: {
                easing: "linear",
                fill: "backwards",
                duration: { type: "unit", value: 302, unit: "ms" },
                rangeStart: ["cover", { type: "unit", value: 0, unit: "%" }],
                rangeEnd: ["cover", { type: "unit", value: 50, unit: "%" }],
              },
            },
          ],
          insetStart: { type: "keyword", value: "auto" },
          insetEnd: { type: "keyword", value: "auto" },
          isPinned: true,
          debug: false,
        }}
      >
        <Heading className={`w-heading cjib6ds`}>
          {"HELLO WORLD"}
          {""}
          <br />
          {""}
          {"GOOD"}
          {""}
          <br />
          {""}
          {"BAD"}
          {""}
          <br />
          {""}
          {"UGLY"}
        </Heading>
      </AnimateChildren>
    </Body>
  );
};

export { Page };
