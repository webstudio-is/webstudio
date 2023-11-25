/**
 * We use mjs extension as constants in this file is shared with the build script
 * and we use `node --eval` to extract the constants.
 */
export const assetBaseUrl = "/assets/";
export const imageBaseUrl = "/assets/";

/**
 * @type {import("@webstudio-is/image").ImageLoader}
 */
export const imageLoader = (props) => {
  if (process.env.NODE_ENV !== "production") {
    return imageBaseUrl + props.src;
  }

  if (props.format === "raw") {
    return imageBaseUrl + props.src;
  }

  // https://docs.netlify.com/image-cdn/overview/
  return (
    "/.netlify/images?url=" +
    encodeURIComponent(imageBaseUrl + props.src) +
    "&w=" +
    props.width +
    "&q=" +
    props.quality
  );
};
