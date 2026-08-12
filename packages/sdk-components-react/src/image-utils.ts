import { getImageAttributes, type ImageLoader } from "@webstudio-is/image";
import type { ComponentPropsWithoutRef } from "react";

export type SdkImageProps = ComponentPropsWithoutRef<"img"> & {
  quality?: number;
  /** Optimize the image for enhanced performance. */
  optimize?: boolean;
  // @todo: This builder-only prop should not be part of the runtime component.
  $webstudio$canvasOnly$assetId?: string;
};

export const getSdkImageProps = ({
  props,
  imageLoader,
  renderer,
}: {
  props: SdkImageProps;
  imageLoader: ImageLoader;
  renderer: "canvas" | "preview" | undefined;
}) => {
  let {
    loading = "lazy",
    width,
    height,
    optimize = true,
    decoding,
    quality,
    $webstudio$canvasOnly$assetId,
    alt,
    sizes,
    srcSet,
    src: source,
    ...imageProps
  } = props;
  const src = String(source ?? "");
  let key = src;

  if (renderer === "canvas") {
    // With disabled cache and loading lazy, Chrome may not render the image.
    loading = "eager";
    // Avoid image flickering when switching from preview to an uploaded asset.
    decoding = "sync";
    key = $webstudio$canvasOnly$assetId ?? src;

    // NaN dimensions mean the image is still uploading and cannot be optimized.
    if (
      width !== undefined &&
      height !== undefined &&
      Number.isNaN(width) &&
      Number.isNaN(height)
    ) {
      optimize = false;
      width = undefined;
      height = undefined;
    }
  }

  return {
    key,
    imageProps: {
      ...imageProps,
      ...getImageAttributes({
        alt,
        width,
        height,
        sizes,
        src,
        srcSet,
        quality,
        loader: imageLoader,
        optimize,
        loading,
        decoding,
      }),
    },
  };
};
