import warnOnce from "warn-once";
import { allSizes, type ImageLoader } from "./image-optimize";

export type ImageLoaderOptions = {
  imageBaseUrl: string;
};

/**
 * Default image loader in case of no loader provided
 * https://developers.cloudflare.com/images/image-resizing/url-format/
 **/
export const createImageLoader =
  (loaderOptions: ImageLoaderOptions): ImageLoader =>
  (props) => {
    const width = props.format === "raw" ? 16 : props.width;
    const quality = props.format === "raw" ? 100 : props.quality;
    const { format, src } = props;

    // load absolute images without changes
    try {
      new URL(src);
      return src;
    } catch {
      // empty block
    }

    if (process.env.NODE_ENV !== "production") {
      warnOnce(
        allSizes.includes(width) === false,
        "Width must be only from allowed values"
      );
    }
    const { imageBaseUrl } = loaderOptions;
    const searchParams = new URLSearchParams();
    searchParams.set("width", width.toString());
    searchParams.set("quality", quality.toString());
    searchParams.set("format", format ?? "auto");

    // Cloudflare docs say that we don't need to urlencode the path params
    return `${imageBaseUrl}${src}?${searchParams.toString()}`;
  };
