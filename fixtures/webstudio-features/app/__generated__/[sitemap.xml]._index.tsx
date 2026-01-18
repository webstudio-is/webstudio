/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import {
  XmlNode as XmlNode,
  XmlTime as XmlTime,
} from "@webstudio-is/sdk-components-react";

export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const lastPublished = "2026-01-15T16:19:55.574Z";

export const siteName = "KittyGuardedZone";

export const breakpoints = [
  { id: "UoTkWyaFuTYJihS3MFYK5" },
  { id: "ZMaWCtWpH-ao0e_kgIHqR", minWidth: 372 },
  { id: "Z8WjyXWkCrr35PXgjHdpY", minWidth: 472 },
];

export const favIconAsset: string | undefined =
  "cat_silhouette_BDpTbUFSpVbfUWQZNxbBG.png";

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
      {Object.entries(
        // @ts-ignore
        [
          {
            path: "/",
            lastModified: "2024-05-07",
          },
          {
            path: "/olegs-test",
            lastModified: "2024-05-07",
          },
        ] ?? {}
      ).map(([_key, url]: any) => {
        const index = Array.isArray([
          {
            path: "/",
            lastModified: "2024-05-07",
          },
          {
            path: "/olegs-test",
            lastModified: "2024-05-07",
          },
        ])
          ? Number(_key)
          : _key;
        return (
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
        );
      })}
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
