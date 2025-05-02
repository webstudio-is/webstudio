import warnOnce from "warn-once";
import { allSizes, type ImageLoader } from "./image-optimize";

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
export const wsImageLoader: ImageLoader = (props) => {
  const width = props.format === "raw" ? 16 : props.width;
  const quality = props.format === "raw" ? 100 : props.quality;

  if (process.env.NODE_ENV !== "production") {
    warnOnce(
      allSizes.includes(width) === false,
      "Width must be only from allowed values"
    );
  }

  // support both "/cgi/asset/name" and "name" as inputs
  let src = props.src;
  if (src.startsWith("/cgi/asset")) {
    src = src.slice("/cgi/asset".length);
  }

  const resultUrl = new URL("/cgi/image/", NON_EXISTING_DOMAIN);

  if (props.format !== "raw") {
    resultUrl.searchParams.set("width", width.toString());
    resultUrl.searchParams.set("quality", quality.toString());

    if (props.height != null) {
      resultUrl.searchParams.set("height", props.height.toString());
    }

    if (props.fit != null) {
      resultUrl.searchParams.set("fit", props.fit);
    }
  }
  resultUrl.searchParams.set("format", props.format ?? "auto");

  resultUrl.pathname = joinPath(resultUrl.pathname, encodePathFragment(src));

  if (resultUrl.href.startsWith(NON_EXISTING_DOMAIN)) {
    return `${resultUrl.pathname}?${resultUrl.searchParams.toString()}`;
  }

  // Cloudflare docs say that we don't need to urlencode the path params
  return resultUrl.href;
};
