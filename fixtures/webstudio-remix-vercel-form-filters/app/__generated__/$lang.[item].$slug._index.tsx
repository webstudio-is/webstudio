/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
import {
  Box as Box,
  Heading as Heading,
  Paragraph as Paragraph,
  Image as Image,
} from "@webstudio-is/sdk-components-react";

export const favIconAsset: ImageAsset | undefined = undefined;

export const socialImageAsset: ImageAsset | undefined = undefined;

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = ({}: { system: any }) => {
  let Products = useResource("Products_1");
  return (
    <Body
      data-ws-id="VvuzTVCj2p37N-FOFiByd"
      data-ws-component="Body"
      className="c12rmqio c1ws6qna c1l7qv32 c1b1kuf5"
    >
      {Products?.data?.data?.products?.map((Product: any, index_1: number) => (
        <Fragment key={index_1}>
          <Box data-ws-id="nuhgrCBS2g_3N20sUvQiD" data-ws-component="Box">
            <Heading
              data-ws-id="CETCMl8Dhd7MZWM3nYL3V"
              data-ws-component="Heading"
            >
              {Product?.name}
            </Heading>
            <Paragraph
              data-ws-id="7dw_cpzpvaiph-zCmE7Kd"
              data-ws-component="Paragraph"
            >
              {Product?.description}
            </Paragraph>
            {Product?.images?.map((Image_1: any, index: number) => (
              <Fragment key={index}>
                <Image
                  data-ws-id="KgfOsiBq9VxntvZ95zXXr"
                  data-ws-component="Image"
                  loading={"eager"}
                  src={Image_1?.url}
                  width={Image_1?.width}
                  height={Image_1?.height}
                />
              </Fragment>
            ))}
          </Box>
        </Fragment>
      ))}
    </Body>
  );
};

export { Page };
