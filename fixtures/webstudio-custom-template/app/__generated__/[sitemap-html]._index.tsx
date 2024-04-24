/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
import { Box as Box, Text as Text } from "@webstudio-is/sdk-components-react";

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

const Page = ({}: { system: any }) => {
  let [origin, set$origin] = useState<any>("https://my-site.cc");
  let sitemapxml = useResource("sitemapxml_1");
  return (
    <Body data-ws-id="rve0BYRbzAkSCr3Lq-wzi" data-ws-component="Body">
      {sitemapxml?.data?.map((url: any, index: number) => (
        <Fragment key={index}>
          <Box data-ws-id="qNCcAfJQFIBEGM99hOGcj" data-ws-component="Box">
            <Text
              data-ws-id="FD1zWHCq5TVsTSBKWbtV3"
              data-ws-component="Text"
              className="c1cymde0"
            >
              {"<url>"}
            </Text>
            <Box
              data-ws-id="eSgI63Vtow0HYHYWUXn3U"
              data-ws-component="Box"
              className="c1mhrh2o c1b095zn"
            >
              <Text
                data-ws-id="YT4punX-Bdhl0Dw8l6kum"
                data-ws-component="Text"
                className="c15pkvqb"
              >
                {"<loc>"}
              </Text>
              <Text
                data-ws-id="85KbQ_KRH5fQsA0pDR9G9"
                data-ws-component="Text"
                className="cjqm8t8"
              >
                {origin + url?.path}
              </Text>
              <Text
                data-ws-id="qdI0BY3e4j8USqw370Qrs"
                data-ws-component="Text"
                className="c15pkvqb"
              >
                {"</loc>"}
              </Text>
            </Box>
            <Box
              data-ws-id="rRH1A7WUjY-_pfauYCmKU"
              data-ws-component="Box"
              className="c1mhrh2o c1b095zn"
            >
              <Text
                data-ws-id="6NZJcVjrr4WHS6eqNG1SF"
                data-ws-component="Text"
                className="c12yyvw2"
              >
                {"<lastmod>"}
              </Text>
              <Text
                data-ws-id="i0u7W1XIPYHdwcD4bmm4Z"
                data-ws-component="Text"
                className="cjqm8t8"
              >
                {url?.lastModified}
              </Text>
              <Text
                data-ws-id="NR5D_PEUVi_P7Agy2g1Zr"
                data-ws-component="Text"
                className="c12yyvw2"
              >
                {"</lastmod>"}
              </Text>
            </Box>
            <Text
              data-ws-id="Q1mx0RlJAIT37qXjHlt95"
              data-ws-component="Text"
              className="c1cymde0"
            >
              {"</url>"}
            </Text>
          </Box>
        </Fragment>
      ))}
    </Body>
  );
};

export { Page };
