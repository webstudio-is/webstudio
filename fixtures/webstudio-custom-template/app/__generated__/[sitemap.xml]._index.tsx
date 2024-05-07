/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import { XmlNode } from "@webstudio-is/sdk-components-react";

export const siteName = "Fixture Site";

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

export const socialImageAsset: ImageAsset | undefined = undefined;

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Body = (props: any) => props.children;

const Page = ({ system: system }: { system: any }) => {
  let sitemapxml = useResource("sitemapxml_1");
  return (
    <Body data-ws-id="rve0BYRbzAkSCr3Lq-wzi" data-ws-component="Body">
      <XmlNode
        data-ws-id="cgaMXxOMMAh4H-u-MB3_0"
        data-ws-component="XmlNode"
        tag={"urlset"}
        xmlns={"http://www.sitemaps.org/schemas/sitemap/0.9"}
      >
        {sitemapxml?.data?.map((url: any, index: number) => (
          <Fragment key={index}>
            <XmlNode
              data-ws-id="SKzEKWw1VtVVFvUcIWuUp"
              data-ws-component="XmlNode"
              tag={"url"}
            >
              <XmlNode
                data-ws-id="9NJGnzZG3iPZs78XPTHhH"
                data-ws-component="XmlNode"
                tag={"loc"}
              >
                {`${system?.origin ?? "${ORIGIN}"}${url?.path}`}
              </XmlNode>
              <XmlNode
                data-ws-id="IjNaHLHI4gWStV8GvhijX"
                data-ws-component="XmlNode"
                tag={"lastmod"}
              >
                {url?.lastModified}
              </XmlNode>
            </XmlNode>
          </Fragment>
        ))}
      </XmlNode>
    </Body>
  );
};

export { Page };
