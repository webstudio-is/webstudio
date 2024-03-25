/**
 * The only intent of this file is to support typings inside ../templates/route-template for easier development.
 **/

import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";

export const favIconAsset: ImageAsset | undefined = undefined;

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = (_props: { system: any }) => {
  return <></>;
};

export { Page };
