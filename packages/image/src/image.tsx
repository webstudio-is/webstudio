import {
  forwardRef,
  type ComponentProps,
  type ForwardRefExoticComponent,
} from "react";
import { getImageAttributes, type ImageLoader } from "./image-optimize";

const defaultTag = "img";

type ImageProps = ComponentProps<typeof defaultTag> & {
  quality?: number;
  optimize?: boolean;
  loader: ImageLoader;
};

export const Image: ForwardRefExoticComponent<ImageProps> = forwardRef(
  (
    {
      quality,
      loader,
      optimize = true,
      loading = "lazy",
      decoding = "async",
      ...imageProps
    },
    ref
  ) => {
    const imageAttributes = getImageAttributes({
      src: imageProps.src,
      srcSet: imageProps.srcSet,
      sizes: imageProps.sizes,
      width: imageProps.width,
      quality,
      loader,
      optimize,
    }) ?? { src: imagePlaceholderDataUrl };

    return (
      <img
        alt=""
        {...imageProps}
        {...imageAttributes}
        decoding={decoding}
        loading={loading}
        ref={ref}
      />
    );
  }
);

Image.displayName = "Image";

export const imagePlaceholderDataUrl: string = `data:image/svg+xml;base64,${btoa(`<svg
  width="140"
  height="140"
  viewBox="0 0 600 600"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  >
  <rect width="600" height="600" fill="#DFE3E6" />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M450 170H150C141.716 170 135 176.716 135 185V415C135 423.284 141.716 430 150 430H450C458.284 430 465 423.284 465 415V185C465 176.716 458.284 170 450 170ZM150 145C127.909 145 110 162.909 110 185V415C110 437.091 127.909 455 150 455H450C472.091 455 490 437.091 490 415V185C490 162.909 472.091 145 450 145H150Z"
    fill="#C1C8CD"
  />
  <path
    d="M237.135 235.012C237.135 255.723 220.345 272.512 199.635 272.512C178.924 272.512 162.135 255.723 162.135 235.012C162.135 214.301 178.924 197.512 199.635 197.512C220.345 197.512 237.135 214.301 237.135 235.012Z"
    fill="#C1C8CD"
  />
  <path
    d="M160 405V367.205L221.609 306.364L256.552 338.628L358.161 234L440 316.043V405H160Z"
    fill="#C1C8CD"
  />
</svg>`)}`;
