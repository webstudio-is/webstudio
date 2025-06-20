/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-router";
import {
  Heading as Heading,
  HtmlEmbed as HtmlEmbed,
  Box as Box,
} from "@webstudio-is/sdk-components-react";

export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const lastPublished = "2025-05-15T22:04:05.511Z";

export const siteName = "KittyGuardedZone";

export const breakpoints = [
  { id: "UoTkWyaFuTYJihS3MFYK5" },
  { id: "ZMaWCtWpH-ao0e_kgIHqR", minWidth: 372 },
  { id: "Z8WjyXWkCrr35PXgjHdpY", minWidth: 472 },
];

export const favIconAsset: string | undefined = undefined;

// Font assets on current page (can be preloaded)
export const pageFontAssets: string[] = [];

export const pageBackgroundImageAssets: string[] = [];

const Page = (_props: { system: any }) => {
  let jsonResourceVariable = useResource("jsonResourceVariable_1");
  let [jsonVar, set$jsonVar] = useVariableState<any>({ hello: "world" });
  let [globalVariable, set$globalVariable] =
    useVariableState<any>("globalValue");
  return (
    <Body className={`w-body`}>
      <Heading className={`w-heading`}>
        {`${jsonResourceVariable?.data?.args}`}
      </Heading>
      <HtmlEmbed
        code={`<script>
const a = ${jsonResourceVariable?.data?.args}

const b = ${jsonVar}

console.log(a, b);
</script>`}
        className={`w-html-embed`}
      />
      <Box className={`w-box`}>{globalVariable}</Box>
    </Body>
  );
};

export { Page };
