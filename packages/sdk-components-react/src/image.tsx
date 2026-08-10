import { type ElementRef, forwardRef, useContext } from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { getSdkImageProps, type SdkImageProps } from "./image-utils";

export const defaultTag = "img";

export const Image = forwardRef<ElementRef<typeof defaultTag>, SdkImageProps>(
  (props, ref) => {
    const { imageLoader, renderer } = useContext(ReactSdkContext);
    const { key, imageProps } = getSdkImageProps({
      props,
      imageLoader,
      renderer,
    });

    return (
      <img
        /**
         * `key` is needed to recreate the image in case of asset change in builder,
         * this gives immediate feedback when an asset is changed.
         *
         * In non-builder mode, key on images are usually also a good idea,
         * prevents showing outdated images on route change.
         **/
        key={key}
        {...imageProps}
        ref={ref}
      />
    );
  }
);

Image.displayName = "Image";
