/**
 * We use mjs extension as constants in this file is shared with the build script
 * and we use `node --eval` to extract the constants.
 */
import { UrlCanParse } from "@webstudio-is/image";

export const assetBaseUrl = "/assets/";
export const imageBaseUrl = "/assets/";

/**
 * @type {import("@webstudio-is/image").ImageLoader}
 */
export const imageLoader = ({ src }) => {
  if (UrlCanParse(src)) {
    return src;
  }

  return imageBaseUrl + src;
};
