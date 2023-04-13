import warnOnce from "warn-once";
import { allSizes, type ImageLoader } from "./image-optimize";

export type CloudflareImageLoaderOptions = {
  // origin of transformation wrapper
  resizeOrigin?: string | null;
  // origin of cdn serving image
  cdnUrl?: string;
};

/**
 * Default image loader in case of no loader provided
 * https://developers.cloudflare.com/images/image-resizing/url-format/
 **/
export const cloudflareImageLoader =
  (loaderOptions: CloudflareImageLoaderOptions | null): ImageLoader =>
  ({ width, src, quality }) => {
    if (process.env.NODE_ENV !== "production") {
      warnOnce(
        allSizes.includes(width) === false,
        "Width must be only from allowed values"
      );
    }

    const cdnUrl = loaderOptions?.cdnUrl ?? "/";
    const imageUrl = `${cdnUrl}${src}`;

    const options = `width=${width},quality=${quality},format=auto`;
    // Cloudflare docs say that we don't need to urlencode the path params
    const pathname = `/cdn-cgi/image/${options}/${imageUrl}`;

    if (loaderOptions?.resizeOrigin != null) {
      const url = new URL(pathname, loaderOptions.resizeOrigin);
      return url.href;
    } else {
      return pathname;
    }
  };

type LocalImageLoaderOptions = {
  publicPath?: string;
};

/**
 * Fake pseudo loader for local testing purposes
 **/
export const localImageLoader =
  (options: LocalImageLoaderOptions): ImageLoader =>
  ({ width, src, quality }) => {
    const { publicPath = "/" } = options;
    // Just emulate like we really resize the image
    const params = new URLSearchParams();
    params.set("width", `${width}`);
    params.set("quality", `${quality}`);
    return `${publicPath}${src}?${params.toString()}`;
  };
