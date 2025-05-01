/**
 * We use mjs extension as constants in this file is shared with the build script
 * and we use `node --eval` to extract the constants.
 */
export const assetBaseUrl = "/assets/";

/**
 * @type {import("@webstudio-is/image").ImageLoader}
 */
export const imageLoader = (props) => {
  if (import.meta.env.DEV) {
    return props.src;
  }

  if (props.format === "raw") {
    return props.src;
  }

  // @todo https://developers.cloudflare.com/images/transform-images/transform-via-url/
  return props.src;
};
