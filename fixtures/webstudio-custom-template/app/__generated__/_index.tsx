/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { Asset, ImageAsset, ProjectMeta } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import type { PageMeta } from "@webstudio-is/react-sdk";
import {
  Body as Body,
  Link as Link,
} from "@webstudio-is/sdk-components-react-remix";
import { Heading as Heading } from "@webstudio-is/sdk-components-react";

import type { PageData } from "~/routes/_index";
export const fontAssets: Asset[] = [];
export const imageAssets: ImageAsset[] = [
  {
    id: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
    name: "home_wsKvRSqvkajPPBeycZ-C8.svg",
    description: null,
    projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
    size: 3350,
    type: "image",
    format: "svg",
    createdAt: "2023-10-30T20:35:47.113Z",
    meta: { width: 16, height: 16 },
  },
];
export const pageData: PageData = {
  project: {
    siteName: "Fixture Site",
    faviconAssetId: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
    code: '<script>console.log(\'HELLO\')</script>\n<meta property="saas:test" content="test">',
  },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "0d856812-61d8-4014-a20a-82e01c0eb8ee";

export const getPageMeta = ({
  params,
  resources,
}: {
  params: Record<string, undefined | string>;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Site Title",
    description: "Page description f511c297-b44f-4e4b-96bd-d013da06bada",
    excludePageFromSearch: undefined,
    socialImageAssetId: undefined,
    socialImageUrl: undefined,
    custom: [],
  };
};

const Page = ({ params: PageParams }: { params: any }) => {
  return (
    <Body
      data-ws-id="ibXgMoi9_ipHx1gVrvii0"
      data-ws-component="Body"
      className="c1vynykc c15qd3jj c122cnm9 c1jp5sfs"
    >
      <Heading
        data-ws-id="7pwqBSgrfuuOfk1JblWcL"
        data-ws-component="Heading"
        className="c11x2bo2"
      >
        {"DO NOT TOUCH THIS PROJECT, IT'S USED FOR FIXTURES"}
      </Heading>
      <Link
        data-ws-id="QzTSoZnbGD6luZ5xcv893"
        data-ws-component="Link"
        href={"/script-test"}
      >
        {"Goto Scr"}
      </Link>
    </Body>
  );
};

export { Page };

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const pagesPaths = new Set(["", "/script-test"]);

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
