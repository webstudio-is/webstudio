/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import {
  Body as Body,
  Link as Link,
} from "@webstudio-is/sdk-components-react-remix";
import {
  Heading as Heading,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react";

export const siteName = "Fixture Site";

export const favIconAsset: ImageAsset | undefined = {
  id: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
  name: "home_wsKvRSqvkajPPBeycZ-C8.svg",
  description: null,
  projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
  size: 3350,
  type: "image",
  format: "svg",
  createdAt: "2023-10-30T20:35:47.113+00:00",
  meta: { width: 16, height: 16 },
};

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = ({}: { system: any }) => {
  return (
    <Body className={"w-body cjrgi00"}>
      <Heading className={"w-heading"}>{"Script Test"}</Heading>
      <Link href={"/"} className={"w-link"}>
        {"Go Home"}
      </Link>
      <HtmlEmbed
        code={
          "<br>\n<script>console.log('SCRIPT TEST SSR')</script>\n<script>console.log('SCRIPT TEST SSR 2')</script>\nSCRIPTS ARE HERE 2<br>"
        }
        className={"w-html-embed"}
      />
      <HtmlEmbed
        code={
          "<script>console.log('SCRIPTS TEST Client')</script>\n<script>console.log('SCRIPTS TEST 2 Client')</script>\nSCRIPTS ARE HERE <br>"
        }
        clientOnly={true}
        className={"w-html-embed"}
      />
    </Body>
  );
};

export { Page };
