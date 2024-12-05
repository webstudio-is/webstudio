/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { XmlNode, XmlTime } from "@webstudio-is/sdk-components-react";

export const siteName = "KittyGuardedZone";

export const favIconAsset: ImageAsset | undefined = {
  id: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
  name: "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png",
  description: null,
  projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
  size: 268326,
  type: "image",
  format: "png",
  createdAt: "2023-10-30T13:51:08.416+00:00",
  meta: { width: 790, height: 786 },
};

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Body = (props: any) => <svg>{props.children}</svg>;
const Heading = (props: any) => null;

const Page = ({ system: system }: { system: any }) => {
  return (
    <Body className={"w-body"}>
      <XmlNode
        tag={"urlset"}
        xmlns={"http://www.sitemaps.org/schemas/sitemap/0.9"}
        xmlns:xhtml={"http://www.w3.org/1999/xhtml"}
      >
        {[
          {
            path: "/",
            lastModified: "2024-05-07",
          },
          {
            path: "/olegs-test",
            lastModified: "2024-05-07",
          },
        ]?.map((url: any, index: number) => (
          <Fragment key={index}>
            <XmlNode tag={"url"}>
              <XmlNode tag={"loc"}>
                {`${system?.origin ?? "${ORIGIN}"}${url?.path}`}
              </XmlNode>
              <XmlNode tag={"lastmod"}>{url?.lastModified}</XmlNode>
              <XmlNode
                tag={"xhtml:link"}
                rel={"alternate"}
                hreflang={"en"}
                href={`${system?.origin ?? "${ORIGIN}"}${url?.path}en`}
              />
            </XmlNode>
          </Fragment>
        ))}
        <Heading tag={"h3"} className={"w-heading c1jumvji cvdtpev"}>
          {"Below is custom section"}
        </Heading>
        <XmlNode tag={"url"}>
          <XmlNode tag={"loc"}>{"custom-hand-made-location"}</XmlNode>
          <XmlNode tag={"lastmod"}>
            <XmlTime datetime={"1733402818245"} />
          </XmlNode>
          <XmlNode
            tag={"xhtml:link"}
            rel={"alternate"}
            hreflang={"en"}
            href={"custom-en-location"}
          />
          <XmlNode tag={"title"}>{"Hello"}</XmlNode>
        </XmlNode>
      </XmlNode>
    </Body>
  );
};

export { Page };
