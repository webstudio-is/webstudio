/**
 * We use mjs extension as constants in this file is shared with the build script
 * and we use `node --eval` to extract the constants.
 */
export const assetBaseUrl = "/assets/";

/**
 * @type {import("@webstudio-is/image").ImageLoader}
 */
export const imageLoader = (props) => {
  if (process.env.NODE_ENV !== "production") {
    return props.src;
  }

  if (props.format === "raw") {
    return props.src;
  }

  // https://vercel.com/blog/build-your-own-web-framework#automatic-image-optimization
  const searchParams = new URLSearchParams();
  searchParams.set("url", props.src);
  searchParams.set("w", props.width.toString());
  searchParams.set("q", props.quality.toString());
  return `/_vercel/image?${searchParams}`;
};
