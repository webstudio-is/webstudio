/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import {
  Body as Body,
  Link as Link,
} from "@webstudio-is/sdk-components-react-router";
import {
  Heading as Heading,
  Text as Text,
  Image as Image,
} from "@webstudio-is/sdk-components-react";

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

export const CustomCode = () => {
  return <></>;
};

const Page = ({}: { system: any }) => {
  return (
    <Body className={`w-body c1jaw2zx cbipm55 ctniqj4 ctgx88l`}>
      <Heading className={`w-heading`}>{"Simple Project to test CLI"}</Heading>
      <Text className={`w-text cn3rfux`}>
        {"Please don't change directly in the fixture"}
      </Text>
      <Link href={"/another-page"} className={`w-link`}>
        {"Test another page link"}
      </Link>
      <Image
        src={"/assets/iconly_svg_converted-converted_zMaMiAAutUl8XrITgz7d1.svg"}
        width={14}
        height={16}
        className={`w-image c161qeci`}
      />
      <Image
        src={"https://picsum.photos/id/237/100/100.jpg?blur=4&grayscale"}
        className={`w-image`}
      />
    </Body>
  );
};

export { Page };
