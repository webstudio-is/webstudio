/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import {
  XmlNode as XmlNode,
  XmlTime as XmlTime,
} from "@webstudio-is/sdk-components-react";

export const siteName = "KittyGuardedZone";

export const favIconAsset: string | undefined =
  "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png";

// Font assets on current page (can be preloaded)
export const pageFontAssets: string[] = [];

export const pageBackgroundImageAssets: string[] = [];

const Page = (_props: { system: any }) => {
  const system = _props.system;
  return (
    <XmlNode
      tag={"urlset"}
      xmlns={"http://www.sitemaps.org/schemas/sitemap/0.9"}
      xmlns:xhtml={"http://www.w3.org/TR/xhtml11/xhtml11_schema.html"}
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
      ]?.map?.((url: any, index: number) => (
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
        <XmlNode tag={"link"}>{"https://webstudio.is"}</XmlNode>
      </XmlNode>
    </XmlNode>
  );
};

export { Page };
