/**
 * We use mjs extension as constants in this file is shared with the build script
 * and we use `node --eval` to extract the constants.
 */
export const assetBaseUrl = "/assets/";
export const imageBaseUrl = "/assets/";

/**
 * @type {import("@webstudio-is/image").ImageLoader}
 */
export const imageLoader = ({ quality, src, width }) => {
  if (process.env.NODE_ENV !== "production") {
    return imageBaseUrl + src;
  }

  // https://vercel.com/blog/build-your-own-web-framework#automatic-image-optimization
  return (
    "/_vercel/image?url=" +
    encodeURIComponent(imageBaseUrl + src) +
    "&w=" +
    width +
    "&q=" +
    quality
  );
};
