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
  Box as Box,
  Paragraph as Paragraph,
  Image as Image,
  Text as Text,
} from "@webstudio-is/sdk-components-react";

export const siteName = "KittyGuardedZone";

export const favIconAsset: ImageAsset | undefined = {
  id: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
  name: "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png",
  description: null,
  projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
  size: 268326,
  type: "image",
  format: "png",
  createdAt: "2023-10-30T13:51:08.416Z",
  meta: { width: 790, height: 786 },
};

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Script = ({ children, ...props }: Record<string, string | boolean>) => {
  if (children == null) {
    return <script {...props} />;
  }

  return <script {...props} dangerouslySetInnerHTML={{ __html: children }} />;
};
const Style = ({ children, ...props }: Record<string, string | boolean>) => {
  if (children == null) {
    return <style {...props} />;
  }

  return <style {...props} dangerouslySetInnerHTML={{ __html: children }} />;
};

export const CustomCode = () => {
  return (
    <>
      <Script>{"console.log('KittyGuardedZone')"}</Script>
      {"\n"}
    </>
  );
};

const Page = ({}: { system: any }) => {
  return (
    <Body
      data-ws-id="On9cvWCxr5rdZtY9O1Bv0"
      data-ws-component="Body"
      className="w-body cielobv"
    >
      <Heading
        data-ws-id="nVMWvMsaLCcb0o1wuNQgg"
        data-ws-component="Heading"
        className="w-heading ceva767"
      >
        {"DO NOT TOUCH THIS PROJECT, IT'S USED FOR FIXTURES"}
      </Heading>
      <Box
        data-ws-id="f0kF-WmL7DQg7MSyRvqY1"
        data-ws-component="Box"
        className="w-box c13v7j50 cqkqnmd cv6wa71"
      >
        <Box
          data-ws-id="5XDbqPrZDeCwq4YJ3CHsc"
          data-ws-component="Box"
          className="w-box c1t3ybra c1qxdkbn c1ogzcge cv3kvac"
        >
          <Heading
            data-ws-id="oLXYe1UQiVMhVnZGvJSMr"
            data-ws-component="Heading"
            className="w-heading"
          >
            {"Heading"}
          </Heading>
          <Paragraph
            data-ws-id="p34JHWcU6UNrd9FVnY80Q"
            data-ws-component="Paragraph"
            className="w-paragraph"
          >
            {
              "a little kitten painted in black and white gouache with a thick brush"
            }
          </Paragraph>
          <Link
            data-ws-id="l9AI_pShC-BH4ibxK6kNT"
            data-ws-component="Link"
            href={"https://github.com/"}
            className="w-link"
          >
            {"Click here to adore more kittens"}
          </Link>
          <Text
            data-ws-id="D8wLZzLWQfxH9uaKsn-0L"
            data-ws-component="Text"
            tag={"span"}
            className="w-text"
          >
            {" or "}
          </Text>
          <Link
            data-ws-id="8AXawjUE3fJoOH_1qOAoq"
            data-ws-component="Link"
            href={"/assets/small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp"}
            className="w-link"
          >
            {"go download this little kitten"}
          </Link>
          <Box
            data-ws-id="82HYqzxZeahPxSDFNWem5"
            data-ws-component="Box"
            className="w-box"
          />
          <Link
            data-ws-id="9I4GRU1sev48hREkQcKQ-"
            data-ws-component="Link"
            href={"/_route_with_symbols_"}
            className="w-link ch2exr5"
          >
            {"Symbols in path"}
          </Link>
          <Link
            data-ws-id="81ejLVXyFEV1SxiJrWhyw"
            data-ws-component="Link"
            href={"/heading-with-id#my-heading"}
            className="w-link ch2exr5"
          >
            {"Link to instance"}
          </Link>
        </Box>
        <Box
          data-ws-id="qPnkiFGDj8dITWb1kmpGl"
          data-ws-component="Box"
          className="w-box c1t3ybra c1qxdkbn c1ogzcge cv3kvac"
        >
          <Image
            data-ws-id="pX1ovPI7NdC0HRjkw6Kpw"
            data-ws-component="Image"
            src={
              "/assets/_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg"
            }
            className="w-image c1czoo99"
          />
        </Box>
      </Box>
    </Body>
  );
};

export { Page };
