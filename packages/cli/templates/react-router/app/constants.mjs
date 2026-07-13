/**
 * We use mjs because this file is shared with the generated build script.
 */
export const assetBaseUrl = "/assets/";

/** @type {import("@webstudio-is/image").ImageLoader} */
export const imageLoader = (props) => {
  return props.src;
};
