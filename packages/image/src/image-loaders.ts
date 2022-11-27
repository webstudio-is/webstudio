import warnOnce from "warn-once";
import { allSizes, type ImageLoader } from "./image-optimize";

export type CloudflareImageLoaderOptions = {
  resizeOrigin?: string | null;
};

/**
 * Default image loader in case of no loader provided
 * https://developers.cloudflare.com/images/image-resizing/url-format/
 **/
export const cloudflareImageLoader: (
  ops: CloudflareImageLoaderOptions | null
) => ImageLoader =
  (loaderOptions) =>
  ({ width, src, quality }) => {
    if (process.env.NODE_ENV !== "production") {
      warnOnce(
        allSizes.includes(width) === false,
        "Width must be only from allowed values"
      );
    }

    const options = `width=${width},quality=${quality},format=auto`;
    // Cloudflare docs say that we don't need to urlencode the path params
    const pathname = `/cdn-cgi/image/${options}/${src}`;

    if (loaderOptions?.resizeOrigin != null) {
      const url = new URL(pathname, loaderOptions.resizeOrigin);
      return url.href;
    } else {
      return pathname;
    }
  };

/**
 * Fake pseudo loader for local testing purposes
 **/
export const localImageLoader: () => ImageLoader =
  () =>
  ({ width, src, quality }) => {
    // Just emulate like we really resize the image
    const params = new URLSearchParams();
    params.set("width", `${width}`);
    params.set("quality", `${quality}`);
    return `${src}?${params.toString()}`;
  };
