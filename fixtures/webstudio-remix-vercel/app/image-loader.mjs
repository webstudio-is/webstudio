import { imageBaseUrl } from "./constants.mjs";

/**
 * @type {import("@webstudio-is/image").ImageLoader}
 */
export const imageLoader = ({ src }) => {
  return imageBaseUrl + src;
};
