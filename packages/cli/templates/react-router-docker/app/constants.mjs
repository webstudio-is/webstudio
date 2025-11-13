/**
 * We use mjs extension as constants in this file is shared with the build script
 * and we use `node --eval` to extract the constants.
 */
export const assetBaseUrl = "/assets/";

/**
 * URL.canParse(props.src)
 * @type {(url: string) => boolean}
 */
const UrlCanParse = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * @type {import("@webstudio-is/image").ImageLoader}
 */
export const imageLoader = (props) => {
  if (props.format === "raw") {
    return props.src;
  }
  // IPX (sharp) does not support ico
  if (props.src.endsWith('.ico')) {
    return props.src;
  }
  // handle absolute urls
  const path = UrlCanParse(props.src) ? `/${props.src}` : props.src;
  // https://github.com/unjs/ipx?tab=readme-ov-file#modifiers
  return `/_image/w_${props.width},q_${props.quality}${path}`;
};
