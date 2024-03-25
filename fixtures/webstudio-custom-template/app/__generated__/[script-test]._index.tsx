/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import {
  Body as Body,
  Link as Link,
} from "@webstudio-is/sdk-components-react-remix";
import { Heading as Heading } from "@webstudio-is/sdk-components-react";

export const favIconAsset: ImageAsset | undefined = {
  id: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
  name: "home_wsKvRSqvkajPPBeycZ-C8.svg",
  description: null,
  projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
  size: 3350,
  type: "image",
  format: "svg",
  createdAt: "2023-10-30T20:35:47.113Z",
  meta: { width: 16, height: 16 },
};

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = ({}: { system: any }) => {
  return (
    <Body
      data-ws-id="LW98_-srDnnagkR10lsk4"
      data-ws-component="Body"
      className="c1vynykc c122cnm9 c15qd3jj c1jp5sfs"
    >
      <Heading data-ws-id="SHXddDLFWST_sy44UfGQO" data-ws-component="Heading">
        {"Script Test"}
      </Heading>
      <Link
        data-ws-id="8MXByradrqVRiGSyHI0aH"
        data-ws-component="Link"
        href={"/"}
      >
        {"Go Home"}
      </Link>
    </Body>
  );
};

export { Page };
