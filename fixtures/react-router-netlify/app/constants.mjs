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

  // https://docs.netlify.com/image-cdn/overview/
  const searchParams = new URLSearchParams();
  searchParams.set("url", props.src);
  searchParams.set("w", props.width.toString());
  if (props.height) {
    searchParams.set("h", props.height.toString());
  }
  searchParams.set("q", props.quality.toString());
  // fit=contain by default
  return `/.netlify/images?${searchParams}`;
};
