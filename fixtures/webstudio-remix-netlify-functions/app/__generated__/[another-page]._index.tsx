/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
import { Heading as Heading } from "@webstudio-is/sdk-components-react";

export const siteName = "";

export const favIconAsset: ImageAsset | undefined = undefined;

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = ({}: { system: any }) => {
  return (
    <Body className={"w-body"}>
      <Heading className={"w-heading"}>{"Another page"}</Heading>
    </Body>
  );
};

export { Page };
