/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-router";
import { Box as Box } from "@webstudio-is/sdk-components-react";

export const siteName = "KittyGuardedZone";

export const favIconAsset: string | undefined =
  "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png";

// Font assets on current page (can be preloaded)
export const pageFontAssets: string[] = [];

export const pageBackgroundImageAssets: string[] = [];

const Page = (_props: { system: any }) => {
  let [classVar, set$classVar] = useVariableState<any>("varClass");
  return (
    <Body className={`w-body`}>
      <Box
        id={"\"broken'with`symbols"}
        className={`w-box cm16yxw ${"custom-class \"broken 'with `symbols"}`}
      />
      <Box className={`w-box ctm310 ${`${classVar} class_3`}`} />
    </Body>
  );
};

export { Page };
