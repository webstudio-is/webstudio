import {
  forwardRef,
  useMemo,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { Image as WebstudioImage, loaders } from "@webstudio-is/image";
import { Image as SdkImage } from "../../components/image";
import { usePropAsset, getInstanceIdFromComponentProps } from "../../props";
import { getParams } from "../params";

const defaultTag = "img";

type Props = ComponentPropsWithoutRef<typeof WebstudioImage>;

export const Image = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const asset = usePropAsset(getInstanceIdFromComponentProps(props), "src");
    const params = getParams();

    const loader = useMemo(() => {
      if (asset === undefined) {
        return null;
      }
      if (asset.location === "REMOTE") {
        return loaders.cloudflareImageLoader(params);
      }
      return loaders.localImageLoader(params);
    }, [asset, params]);

    let src = props.src;

    if (asset != null) {
      src = asset.path;
    }

    if (asset == null || loader == null) {
      return <SdkImage key={src} {...props} src={src} ref={ref} />;
    }

    return (
      <WebstudioImage
        /**
         * `key` is needed to recreate the image in case of asset change in builder,
         * this gives immediate feedback when an asset is changed.
         * Also, it visually fixes image distortion when another asset has a seriously different  aspectRatio
         * (we change aspectRatio CSS prop on asset change)
         *
         * In non-builder mode, key on images are usually also a good idea,
         * prevents showing outdated images on route change.
         **/
        key={src}
        {...props}
        loader={loader}
        src={src}
        ref={ref}
      />
    );
  }
);

Image.displayName = "Image";
