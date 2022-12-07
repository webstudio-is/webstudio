import {
  forwardRef,
  useMemo,
  type ComponentProps,
  type ElementRef,
} from "react";
import { Image as WebstudioImage, loaders } from "@webstudio-is/image";
import { Image as SdkImage } from "../../components/image";
import { useUserPropsAsset } from "../../user-props/use-user-props-asset";
import { idAttribute } from "../../tree/wrapper-component";
import { getParams } from "../params";

const defaultTag = "img";

type Props = ComponentProps<typeof WebstudioImage> & { [idAttribute]: string };

export const Image = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    const componentId = props[idAttribute] as string;

    const asset = useUserPropsAsset(componentId, "src");
    const params = getParams();

    const loader = useMemo(() => {
      if (asset == null) return null;
      if (asset.location === "REMOTE")
        return loaders.cloudflareImageLoader(params);
      return loaders.localImageLoader();
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
         * `key` is needed to recreate the image in case of asset change in designer,
         * this gives immediate feedback when an asset is changed.
         * Also, it visually fixes image distortion when another asset has a seriously different  aspectRatio
         * (we change aspectRatio CSS prop on asset change)
         *
         * In non-designer mode, key on images are usually also a good idea,
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
