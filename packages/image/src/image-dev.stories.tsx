// Story for image development, see https://github.com/webstudio-is/webstudio/issues/387

import type * as React from "react";
import type { Meta, StoryFn } from "@storybook/react";
import { Image as ImagePrimitive, createImageLoader } from "./";

// to not allow include local assets everywhere, just enable it for this file
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import localLogoImage from "../storybook-assets/logo.webp"; // eslint-disable-line

export default {
  title: "Components/ImageDev",
} satisfies Meta<typeof ImagePrimitive>;

type ImageProps = React.ComponentProps<typeof ImagePrimitive>;

/**
 * In case you need to test img with real cloudflare trasforms
 * set  USE_CLOUDFLARE_IMAGE_TRANSFORM = true
 **/
const USE_CLOUDFLARE_IMAGE_TRANSFORM = false;

// For cloudflare image transform testing, logo should be the most consistent image on the project
const REMOTE_SELF_DOMAIN_IMAGE = "https://webstudio.is/logo.webp";

const imageSrc = USE_CLOUDFLARE_IMAGE_TRANSFORM
  ? REMOTE_SELF_DOMAIN_IMAGE
  : localLogoImage;

const imageLoader = createImageLoader({
  imageBaseUrl: USE_CLOUDFLARE_IMAGE_TRANSFORM
    ? "https://webstudio.is/cdn-cgi/image/"
    : "",
});

const ImageBase: StoryFn<
  React.ForwardRefExoticComponent<
    Omit<ImageProps, "loader"> & {
      style?: React.HTMLAttributes<"img">["style"];
    }
  >
> = (args) => {
  const style = {
    maxWidth: "100%",
    display: "block",
    ...args.style,
  };

  return (
    <ImagePrimitive
      {...args}
      optimize={true}
      loader={imageLoader}
      style={style}
    />
  );
};

/**
 * Load images depending on image width and device per pixel ratio.
 **/
export const FixedWidthImage: StoryFn<React.FunctionComponent> = () => (
  <ImageBase src={imageSrc} width="300" height="400" />
);

/**
 * Preserve ratio using object-fit: cover. Load images depending on image width and device per pixel ratio.
 **/
export const FixedWidthImageCover: StoryFn<React.FunctionComponent> = () => (
  <ImageBase
    src={imageSrc}
    width="300"
    height="400"
    style={{ objectFit: "cover" }}
  />
);

/**
 * Load images depending on the viewport width.
 **/
export const UnknownWidthImage: StoryFn<React.FunctionComponent> = () => (
  <ImageBase src={imageSrc} />
);

/**
 * Fit width of the parent container, has own aspect-ratio and object-fit=cover.
 * Load images depending on the viewport width.
 **/
export const AspectRatioImage: StoryFn<React.FunctionComponent> = () => (
  <div style={{ width: "50%" }}>
    <ImageBase
      src={imageSrc}
      style={{ aspectRatio: "2/1", objectFit: "cover", width: "100%" }}
    />
  </div>
);

/**
 * Fill width and height of the relative parent container, object-fit=cover. Load images depending on the viewport width.
 **/
export const FillParentImage: StoryFn<React.FunctionComponent> = () => (
  <div style={{ width: "50%", aspectRatio: "2/1", position: "relative" }}>
    <ImageBase
      src={imageSrc}
      style={{
        objectFit: "cover",
        position: "absolute",
        width: "100%",
        height: "100%",
      }}
    />
  </div>
);

/**
 * "sizes" attribute explicitly equal to 100vw allowing to skip the default behavior.
 * See DEFAULT_SIZES in the Image component. Load images depending on the viewport width.
 **/
export const HeroImage: StoryFn<React.FunctionComponent> = () => (
  <ImageBase
    src={imageSrc}
    sizes="100vw"
    style={{
      aspectRatio: "3/1",
      objectFit: "cover",
      width: "100%",
    }}
  />
);
