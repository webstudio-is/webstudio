import {
  forwardRef,
  type ComponentProps,
  type ForwardRefExoticComponent,
} from "react";
import { getImageProps } from "./image-utils";
import type { ImageLoader } from "./image-optimize";

const defaultTag = "img";

export type ImageProps = ComponentProps<typeof defaultTag> & {
  quality?: number;
  /** Optimize the image for enhanced performance. */
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
    const attributes = getImageProps({
      imageProps,
      quality,
      loader,
      optimize,
      loading,
      decoding,
    });

    return <img {...attributes} ref={ref} />;
  }
);

Image.displayName = "Image";
