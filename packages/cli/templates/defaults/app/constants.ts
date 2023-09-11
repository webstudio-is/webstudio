import type { ImageLoader } from "@webstudio-is/image";

export const assetBaseUrl = "/assets/";
export const imageBaseUrl = "/assets/";

export const imageLoader: ImageLoader = ({ quality, src, width }) => {
  if (process.env.NODE_ENV !== "production") {
    return imageBaseUrl + src;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("w", width.toString());
  searchParams.set("q", quality.toString());

  // https://vercel.com/blog/build-your-own-web-framework#automatic-image-optimization
  return (
    "/_vercel/image?url=" +
    encodeURIComponent(src) +
    "&w=" +
    width +
    "&q=" +
    quality
  );
};
