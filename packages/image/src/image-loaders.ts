import warnOnce from "warn-once";
import { allSizes, type ImageLoader } from "./image-optimize";

export type ImageLoaderOptions = {
  imageBaseUrl: string;
  disableOptions?: boolean;
};

/**
 * Default image loader in case of no loader provided
 * https://developers.cloudflare.com/images/image-resizing/url-format/
 **/
export const createImageLoader =
  (loaderOptions: ImageLoaderOptions): ImageLoader =>
  ({ width, src, quality }) => {
    if (process.env.NODE_ENV !== "production") {
      warnOnce(
        allSizes.includes(width) === false,
        "Width must be only from allowed values"
      );
    }
    const { imageBaseUrl, disableOptions = false } = loaderOptions;

    const options = disableOptions
      ? ""
      : `width=${width},quality=${quality},format=auto/`;
    // Cloudflare docs say that we don't need to urlencode the path params
    return `${imageBaseUrl}${options}${src}`;
  };
