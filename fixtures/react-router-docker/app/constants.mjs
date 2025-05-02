/**
 * We use mjs extension as constants in this file is shared with the build script
 * and we use `node --eval` to extract the constants.
 */
export const assetBaseUrl = "/assets/";

/**
 * @type {import("@webstudio-is/image").ImageLoader}
 */
export const imageLoader = (props) => {
  if (props.format === "raw") {
    return props.src;
  }
  // handle absolute urls
  const path = URL.canParse(props.src) ? `/${props.src}` : props.src;
  // https://github.com/unjs/ipx?tab=readme-ov-file#modifiers
  return `/_image/w_${props.width},q_${props.quality}${path}`;
};
