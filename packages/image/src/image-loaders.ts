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

const getImageSource = (src: string) => {
  if (src.startsWith("/cgi/asset")) {
    return decodeURIComponent(src.slice("/cgi/asset".length).split("?")[0]);
  }
  if (src.startsWith("/cgi/image")) {
    return decodeURIComponent(src.slice("/cgi/image".length).split("?")[0]);
  }
  return src;
};

/**
 * Default image loader in case of no loader provided
 * https://developers.cloudflare.com/images/image-resizing/url-format/
 **/
export const wsImageLoader: ImageLoader = (props) => {
  const shouldTransform = "width" in props;

  if (process.env.NODE_ENV !== "production" && shouldTransform) {
    warnOnce(
      allSizes.includes(props.width) === false,
      "Width must be only from allowed values"
    );
  }

  // support proxied asset/image urls and plain asset names as inputs
  const src = getImageSource(props.src);

  const resultUrl = new URL("/cgi/image/", NON_EXISTING_DOMAIN);

  if (shouldTransform) {
    resultUrl.searchParams.set("width", props.width.toString());
    resultUrl.searchParams.set("quality", props.quality.toString());

    if (props.height != null) {
      resultUrl.searchParams.set("height", props.height.toString());
    }

    if (props.fit != null) {
      resultUrl.searchParams.set("fit", props.fit);
    }
    resultUrl.searchParams.set("format", props.format ?? "auto");
  }

  resultUrl.pathname = joinPath(resultUrl.pathname, encodePathFragment(src));

  if (resultUrl.href.startsWith(NON_EXISTING_DOMAIN)) {
    return `${resultUrl.pathname}${resultUrl.search}`;
  }

  // Cloudflare docs say that we don't need to urlencode the path params
  return resultUrl.href;
};

export type VideoLoader = (options: { src: string }) => string;

export const wsVideoLoader: VideoLoader = ({ src }) => {
  if (src.startsWith("/cgi/asset/")) {
    src = src.slice("/cgi/asset/".length);
  }
  return `/cgi/video/${src}`;
};
