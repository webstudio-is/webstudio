/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
import { Heading as Heading } from "@webstudio-is/sdk-components-react";

export const projectId = "d845c167-ea07-4875-b08d-83e97c09dcce";

export const lastPublished = "2024-07-29T12:50:07.515Z";

export const siteName = "";

export const breakpoints = [
  { id: "rKj-wYctg3-GnqL3WHN9I" },
  { id: "yH9RXhqCyeaVkrOt8MzLc", maxWidth: 991 },
  { id: "8nSCZbeS002IVwkTdoIes", maxWidth: 767 },
  { id: "7gBD25KrrbBdJYNDlhPz7", maxWidth: 479 },
];

export const favIconAsset: string | undefined = undefined;

// Font assets on current page (can be preloaded)
export const pageFontAssets: string[] = [];

export const pageBackgroundImageAssets: string[] = [];

const Page = (_props: { system: any }) => {
  return (
    <Body className={`w-body`}>
      <Heading className={`w-heading`}>{"Another page"}</Heading>
    </Body>
  );
};

export { Page };
