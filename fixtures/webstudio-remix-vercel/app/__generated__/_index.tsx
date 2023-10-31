/* eslint-disable */
/* This is a auto generated file for building the project */

import { type ReactNode, useState } from "react";
import type { PageData } from "~/routes/_index";
import type { Asset, ImageAsset, SiteMeta } from "@webstudio-is/sdk";
import {
  Body as Body,
  Heading as Heading,
  Box as Box,
  Paragraph as Paragraph,
  Image as Image,
  Text as Text,
} from "@webstudio-is/sdk-components-react";
import { Link as Link } from "@webstudio-is/sdk-components-react-remix";

export const fontAssets: Asset[] = [];
export const imageAssets: ImageAsset[] = [
  {
    id: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
    name: "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png",
    description: null,
    projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
    size: 268326,
    type: "image",
    format: "png",
    createdAt: "2023-10-30T13:51:08.416Z",
    meta: { width: 790, height: 786 },
  },
  {
    id: "9a8bc926-7804-4d3f-af81-69196b1d2ed8",
    name: "small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp",
    description: null,
    projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
    size: 2906,
    type: "image",
    format: "webp",
    createdAt: "2023-09-12T09:44:22.120Z",
    meta: { width: 100, height: 100 },
  },
  {
    id: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
    name: "_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg",
    description: null,
    projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
    size: 210614,
    type: "image",
    format: "jpeg",
    createdAt: "2023-09-06T11:28:43.031Z",
    meta: { width: 1024, height: 1024 },
  },
];
export const pageData: PageData = {
  site: {
    siteName: "KittyGuardedZone",
    faviconAssetId: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
    code: "",
  },
  page: {
    id: "7Db64ZXgYiRqKSQNR-qTQ",
    name: "Home",
    title: "The Ultimate Cat Protection Zone",
    meta: {
      description:
        "Dive into the world of felines and discover why some whiskers are best left untouched. From intriguing cat behaviors to protective measures, \nKittyGuardedZone is your go-to hub for all things 'hands-off' in the cat realm.",
      socialImageAssetId: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
    },
    rootInstanceId: "On9cvWCxr5rdZtY9O1Bv0",
    path: "",
  },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

const Page = (props: { scripts?: ReactNode }) => {
  return (
    <Body data-ws-id="On9cvWCxr5rdZtY9O1Bv0" data-ws-component="Body">
      <Heading data-ws-id="nVMWvMsaLCcb0o1wuNQgg" data-ws-component="Heading">
        {"DO NOT TOUCH THIS PROJECT, IT'S USED FOR FIXTURES"}
      </Heading>
      <Box data-ws-id="f0kF-WmL7DQg7MSyRvqY1" data-ws-component="Box">
        <Box data-ws-id="5XDbqPrZDeCwq4YJ3CHsc" data-ws-component="Box">
          <Heading
            data-ws-id="oLXYe1UQiVMhVnZGvJSMr"
            data-ws-component="Heading"
          >
            {"Heading"}
          </Heading>
          <Paragraph
            data-ws-id="p34JHWcU6UNrd9FVnY80Q"
            data-ws-component="Paragraph"
          >
            {
              "a little kitten painted in black and white gouache with a thick brush"
            }
          </Paragraph>
          <Link
            data-ws-id="l9AI_pShC-BH4ibxK6kNT"
            data-ws-component="Link"
            href={"https://github.com/"}
          >
            {"Click here to adore more kittens"}
          </Link>
          <Text
            data-ws-id="D8wLZzLWQfxH9uaKsn-0L"
            data-ws-component="Text"
            tag={"span"}
          >
            {" or "}
          </Text>
          <Link
            data-ws-id="8AXawjUE3fJoOH_1qOAoq"
            data-ws-component="Link"
            href={"/assets/small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp"}
          >
            {"go download this little kitten"}
          </Link>
          <Box data-ws-id="82HYqzxZeahPxSDFNWem5" data-ws-component="Box" />
          <Link
            data-ws-id="9I4GRU1sev48hREkQcKQ-"
            data-ws-component="Link"
            href={"/_route_with_symbols_"}
          >
            {"Symbols in path"}
          </Link>
          <Link
            data-ws-id="81ejLVXyFEV1SxiJrWhyw"
            data-ws-component="Link"
            href={"/heading-with-id#my-heading"}
          >
            {"Link to instance"}
          </Link>
        </Box>
        <Box data-ws-id="qPnkiFGDj8dITWb1kmpGl" data-ws-component="Box">
          <Image
            data-ws-id="pX1ovPI7NdC0HRjkw6Kpw"
            data-ws-component="Image"
            src={
              "/assets/_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg"
            }
          />
        </Box>
      </Box>
      {props.scripts}
    </Body>
  );
};

export { Page };

export const pagesPaths = new Set([
  "",
  "/radix",
  "/_route_with_symbols_",
  "/form",
  "/heading-with-id",
]);

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
