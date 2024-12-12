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
export const imageLoader = (props) => {
  if (UrlCanParse(props.src)) {
    return props.src;
  }

  if (process.env.NODE_ENV !== "production") {
    return props.src;
  }

  if (props.format === "raw") {
    return props.src;
  }

  // https://docs.netlify.com/image-cdn/overview/
  return (
    "/.netlify/images?url=" +
    encodeURIComponent(props.src) +
    "&w=" +
    props.width +
    "&q=" +
    props.quality
  );
};
