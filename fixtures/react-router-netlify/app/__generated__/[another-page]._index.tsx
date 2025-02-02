/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-router";
import { Heading as Heading } from "@webstudio-is/sdk-components-react";

export const siteName = "";

export const favIconAsset: ImageAsset | undefined = {
  id: "d0974db9300c1a3b0fb8b291dd9fabd45ad136478908394280af2f7087e3aecd",
  name: "147-1478573_cat-icon-png-black-cat-png-icon.png_ZJ6-qJjk1RlFzuYwyCXdp.jpeg",
  description: null,
  projectId: "d845c167-ea07-4875-b08d-83e97c09dcce",
  size: 64701,
  type: "image",
  format: "jpg",
  createdAt: "2024-12-06T14:36:07.046+00:00",
  meta: { width: 820, height: 985 },
};

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = ({}: { system: any }) => {
  return (
    <Body className={`w-body`}>
      <Heading className={`w-heading`}>{"Another page"}</Heading>
    </Body>
  );
};

export { Page };
