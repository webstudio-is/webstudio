import type { ImageLoader } from "@webstudio-is/image";

export const assetBaseUrl = "/assets/";
export const imageBaseUrl = "/assets/";

export const imageLoader: ImageLoader = ({ quality, src, width }) => {
  if (process.env.NODE_ENV !== "production") {
    return imageBaseUrl + src;
  }

  // https://vercel.com/blog/build-your-own-web-framework#automatic-image-optimization
  return (
    "/_vercel/image?url=" +
    encodeURIComponent(imageBaseUrl + src) +
    "&w=" +
    width +
    "&q=" +
    quality
  );
};
