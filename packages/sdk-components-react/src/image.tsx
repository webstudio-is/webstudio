import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
  useContext,
} from "react";
import { Image as WebstudioImage } from "@webstudio-is/image";
import { ReactSdkContext } from "@webstudio-is/react-sdk";

export const defaultTag = "img";

const imagePlaceholderSvg = `data:image/svg+xml;base64,${btoa(`<svg
  width="140"
  height="140"
  viewBox="0 0 600 600"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  >
  <rect width="600" height="600" fill="#CCCCCC" />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M450 170H150C141.716 170 135 176.716 135 185V415C135 423.284 141.716 430 150 430H450C458.284 430 465 423.284 465 415V185C465 176.716 458.284 170 450 170ZM150 145C127.909 145 110 162.909 110 185V415C110 437.091 127.909 455 150 455H450C472.091 455 490 437.091 490 415V185C490 162.909 472.091 145 450 145H150Z"
    fill="#A2A2A2"
  />
  <path
    d="M237.135 235.012C237.135 255.723 220.345 272.512 199.635 272.512C178.924 272.512 162.135 255.723 162.135 235.012C162.135 214.301 178.924 197.512 199.635 197.512C220.345 197.512 237.135 214.301 237.135 235.012Z"
    fill="#A2A2A2"
  />
  <path
    d="M160 405V367.205L221.609 306.364L256.552 338.628L358.161 234L440 316.043V405H160Z"
    fill="#A2A2A2"
  />
</svg>`)}`;

type Props = Omit<ComponentPropsWithoutRef<typeof WebstudioImage>, "loader">;

export const Image = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ loading = "lazy", ...props }, ref) => {
    const { imageLoader, renderer, assetBaseUrl } = useContext(ReactSdkContext);

    if (renderer === "canvas") {
      // With disabled cache and loading lazy, chrome may not render the image at all
      loading = "eager";
    }

    if (
      props.src === undefined ||
      props.src.startsWith(assetBaseUrl) === false
    ) {
      return (
        <img
          key={props.src}
          loading={loading}
          {...props}
          src={props.src || imagePlaceholderSvg}
          ref={ref}
        />
      );
    }

    // webstudio pass resolved assetBaseUrl + asset.name
    // trim assetBaseUrl and pass only asset.name to image loader
    const src = props.src.slice(assetBaseUrl.length);

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
        loading={loading}
        {...props}
        loader={imageLoader}
        src={src}
        ref={ref}
      />
    );
  }
);

Image.displayName = "Image";
