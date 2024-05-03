/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
import {
  Heading as Heading,
  Text as Text,
} from "@webstudio-is/sdk-components-react";

export const siteName = "";

export const favIconAsset: ImageAsset | undefined = undefined;

export const socialImageAsset: ImageAsset | undefined = undefined;

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = ({}: { system: any }) => {
  return (
    <Body
      data-ws-id="MMimeobf_zi4ZkRGXapju"
      data-ws-component="Body"
      className="c1jaw2zx c1bn74oy c1vwwfi7 c1xn7xpo"
    >
      <Heading data-ws-id="MYDt0guk1-vzc7yzqyN6A" data-ws-component="Heading">
        {"Simple Project to test CLI"}
      </Heading>
      <Text data-ws-id="BMJfjOzunWs8XkQgvvx1e" data-ws-component="Text">
        {"Please don't change directly in the fixture"}
      </Text>
    </Body>
  );
};

export { Page };
