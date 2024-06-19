import warnOnce from "warn-once";
import { allSizes, type ImageLoader } from "./image-optimize";

export type ImageLoaderOptions = {
  imageBaseUrl: string;
};

const NON_EXISTING_DOMAIN = "https://a3cbcbec-cdb1-4ea4-ad60-43c795308ddc.ddc";

const joinPath = (...segments: string[]) => {
  return segments
    .filter((segment) => segment !== "") // Remove empty segments
    .map((segment) => segment.replace(/(^\/+|\/+$)/g, "")) // Remove leading and trailing slashes from each segment
    .join("/");
};

const encodePathFragment = (fragment: string) => {
  return encodeURIComponent(fragment).replace(/%2F/g, "/");
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

    if (process.env.NODE_ENV !== "production") {
      warnOnce(
        allSizes.includes(width) === false,
        "Width must be only from allowed values"
      );
    }
    const { imageBaseUrl } = loaderOptions;

    let resultUrl;
    try {
      resultUrl = new URL(imageBaseUrl, NON_EXISTING_DOMAIN);
    } catch {
      return src;
    }

    // const searchParams = new URLSearchParams();

    resultUrl.searchParams.set("width", width.toString());
    resultUrl.searchParams.set("quality", quality.toString());
    resultUrl.searchParams.set("format", format ?? "auto");

    if (props.format !== "raw" && props.height != null) {
      resultUrl.searchParams.set("height", props.height.toString());
    }

    if (props.format !== "raw" && props.fit != null) {
      resultUrl.searchParams.set("fit", props.fit);
    }

    resultUrl.pathname = joinPath(resultUrl.pathname, encodePathFragment(src));

    if (resultUrl.href.startsWith(NON_EXISTING_DOMAIN)) {
      return `${resultUrl.pathname}?${resultUrl.searchParams.toString()}`;
    }

    // Cloudflare docs say that we don't need to urlencode the path params
    return resultUrl.href;
  };
