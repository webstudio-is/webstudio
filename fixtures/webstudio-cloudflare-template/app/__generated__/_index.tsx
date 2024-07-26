/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import {
  Body as Body,
  Link as Link,
} from "@webstudio-is/sdk-components-react-remix";
import {
  Heading as Heading,
  Text as Text,
  Image as Image,
} from "@webstudio-is/sdk-components-react";

export const siteName = "";

export const favIconAsset: ImageAsset | undefined = undefined;

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

export const CustomCode = () => {
  return <></>;
};

const Page = ({}: { system: any }) => {
  return (
    <Body
      data-ws-id="MMimeobf_zi4ZkRGXapju"
      data-ws-component="Body"
      className="w-body c1jaw2zx cbipm55 ctniqj4 ctgx88l"
    >
      <Heading
        data-ws-id="MYDt0guk1-vzc7yzqyN6A"
        data-ws-component="Heading"
        className="w-heading"
      >
        {"Simple Project to test CLI"}
      </Heading>
      <Text
        data-ws-id="BMJfjOzunWs8XkQgvvx1e"
        data-ws-component="Text"
        className="w-text cn3rfux"
      >
        {"Please don't change directly in the fixture"}
      </Text>
      <Link
        data-ws-id="pjkZo5EiBqaeUXBcyHf_O"
        data-ws-component="Link"
        href={"/another-page"}
        className="w-link"
      >
        {"Test another page link"}
      </Link>
      <Image
        data-ws-id="uHB3Fjb7-NELG-bnH7bXB"
        data-ws-component="Image"
        src={"/assets/iconly_svg_converted-converted_zMaMiAAutUl8XrITgz7d1.svg"}
        width={14}
        height={16}
        className="w-image c161qeci"
      />
    </Body>
  );
};

export { Page };
