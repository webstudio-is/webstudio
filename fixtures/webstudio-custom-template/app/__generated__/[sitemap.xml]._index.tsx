/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { XmlNode, XmlTime } from "@webstudio-is/sdk-components-react";

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

const Body = (props: any) => <svg>{props.children}</svg>;

const Page = ({ system: system }: { system: any }) => {
  let sitemapxml = useResource("sitemapxml_1");
  return (
    <Body className={"w-body"}>
      <XmlNode
        tag={"urlset"}
        xmlns={"http://www.sitemaps.org/schemas/sitemap/0.9"}
      >
        {sitemapxml?.data?.map((url: any, index: number) => (
          <Fragment key={index}>
            <XmlNode tag={"url"}>
              <XmlNode tag={"loc"}>
                {`${system?.origin ?? "${ORIGIN}"}${url?.path}`}
              </XmlNode>
              <XmlNode tag={"lastmod"}>{url?.lastModified}</XmlNode>
            </XmlNode>
          </Fragment>
        ))}
      </XmlNode>
    </Body>
  );
};

export { Page };
