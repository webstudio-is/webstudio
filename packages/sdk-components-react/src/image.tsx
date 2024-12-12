import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
  useContext,
} from "react";
import { Image as WebstudioImage } from "@webstudio-is/image";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";

export const defaultTag = "img";

type Props = Omit<ComponentPropsWithoutRef<typeof WebstudioImage>, "loader">;

export const Image = forwardRef<
  ElementRef<typeof defaultTag>,
  Props & { $webstudio$canvasOnly$assetId?: string | undefined }
>(
  (
    {
      loading = "lazy",
      width,
      height,
      optimize = true,
      decoding: decodingProp,
      // @todo: it's a hack made for the builder and should't be in the runtime at all.
      $webstudio$canvasOnly$assetId,
      ...props
    },
    ref
  ) => {
    // cast to string when invalid value type is provided with binding
    const src = String(props.src ?? "");

    const { imageLoader, renderer } = useContext(ReactSdkContext);

    let decoding = decodingProp;

    let key = src;

    if (renderer === "canvas") {
      // With disabled cache and loading lazy, chrome may not render the image at all
      loading = "eager";

      // Avoid image flickering on switching from preview to asset (during upload)
      decoding = "sync";

      // use assetId as key to not recreate the image if it's switched from uploading to uploaded asset state (we don't know asset src during uploading)
      key = $webstudio$canvasOnly$assetId ?? src;

      // NaN width and height means that the image is not yet uploaded, and should not be optimized on canvas
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

    return (
      <WebstudioImage
        /**
         * `key` is needed to recreate the image in case of asset change in builder,
         * this gives immediate feedback when an asset is changed.
         *
         * In non-builder mode, key on images are usually also a good idea,
         * prevents showing outdated images on route change.
         **/
        key={key}
        loading={loading}
        decoding={decoding}
        optimize={optimize}
        width={width}
        height={height}
        {...props}
        loader={imageLoader}
        src={src}
        ref={ref}
      />
    );
  }
);

Image.displayName = "Image";
