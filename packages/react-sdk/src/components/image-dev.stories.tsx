// Story for image development, see https://github.com/webstudio-is/webstudio-designer/issues/387

import React, { type ComponentProps, type HTMLAttributes } from "react";
import type { ComponentMeta, ComponentStory } from "@storybook/react";
import { Image as ImagePrimitive } from "./image";
import { type ImageLoader } from "../component-utils/image";
import argTypes from "./image.props.json";

// to not allow include local assets everywhere, just enable it for this file
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import localLogoImage from "../../storybook-assets/logo.webp";

export default {
  title: "Components/ImageDev",
  component: ImagePrimitive,
  argTypes,
} as ComponentMeta<typeof ImagePrimitive>;

type ImageProps = ComponentProps<typeof ImagePrimitive>;

/**
 * In case you need to test img with real cloudflare trasforms
 * set  USE_CLOUDFLARE_IMAGE_TRANSFORM = true
 **/
const USE_CLOUDFLARE_IMAGE_TRANSFORM = false;

// For cloudflare image transform testing, logo should be the most consistent image on the site
const REMOTE_SELF_DOMAIN_IMAGE = "https://webstudio.is/logo.webp";

const imageSrc = USE_CLOUDFLARE_IMAGE_TRANSFORM
  ? REMOTE_SELF_DOMAIN_IMAGE
  : localLogoImage;

// In case of REMOTE_DEBUG
const cloudflareImageLoader: ImageLoader = ({ width, src, quality }) => {
  // No image transformation in development
  const resizeOrigin = "https://webstudio.is";

  const pathParams = [
    `width=${width}`,
    quality != null && `quality=${quality}`,
    "format=auto",
  ].filter(Boolean);

  const pathname = `/cdn-cgi/image/${pathParams.join(",")}/${src}`;

  const url = new URL(pathname, resizeOrigin);
  return url.href;
};

const localImageLoader: ImageLoader = ({ width, src, quality }) => {
  // Just emulate like we really resize the image
  const params = new URLSearchParams();
  params.set("width", `${width}`);
  params.set("quality", `${quality}`);
  return `${src}?${params.toString()}`;
};

const imageLoader = USE_CLOUDFLARE_IMAGE_TRANSFORM
  ? cloudflareImageLoader
  : localImageLoader;

const ImageTemplate: ComponentStory<
  React.ForwardRefExoticComponent<
    ImageProps & { style: HTMLAttributes<"img">["style"] }
  >
> = (args) => {
  const style = { maxWidth: "100%", ...args.style };

  return (
    <ImagePrimitive
      {...args}
      optimize={true}
      loader={imageLoader}
      style={style}
    />
  );
};

export const FixedWidthImage = ImageTemplate.bind({});

FixedWidthImage.parameters = {
  docs: {
    description: {
      story: "Load images depending on image width and device per pixel ratio.",
    },
  },
};

FixedWidthImage.args = {
  src: imageSrc,
  width: 300,
  height: 400,
};

export const FixedWidthImageCover = ImageTemplate.bind({});

FixedWidthImageCover.parameters = {
  docs: {
    description: {
      story:
        "Preserve ratio using object-fit: cover. Load images depending on image width and device per pixel ratio.",
    },
  },
};

FixedWidthImageCover.args = {
  src: imageSrc,
  width: 300,
  height: 400,
  style: { objectFit: "cover" },
};

export const UnknownWidthImage = ImageTemplate.bind({});

UnknownWidthImage.parameters = {
  docs: {
    description: {
      story: `Load images depending on the viewport width.`,
    },
  },
};

UnknownWidthImage.args = {
  src: imageSrc,
};

export const AspectRatioImage = ImageTemplate.bind({});

AspectRatioImage.parameters = {
  docs: {
    description: {
      story: `Fit width of the parent container, has own aspect-ratio and object-fit=cover. Load images depending on the viewport width.`,
    },
  },
};

AspectRatioImage.decorators = [
  (Story) => <div style={{ maxWidth: "400px" }}>{<Story />}</div>,
];

AspectRatioImage.args = {
  src: imageSrc,
  style: { aspectRatio: "2/1", objectFit: "cover", width: "100%" },
};

export const FillParentImage = ImageTemplate.bind({});

FillParentImage.parameters = {
  docs: {
    description: {
      story: `Fill width and height of the relative parent container, object-fit=cover. Load images depending on the viewport width.`,
    },
  },
};

FillParentImage.decorators = [
  (Story) => (
    <div
      style={{
        maxWidth: "400px",
        aspectRatio: "2/1",
        position: "relative",
        border: "1px solid red",
      }}
    >
      {<Story />}
    </div>
  ),
];

FillParentImage.args = {
  src: imageSrc,
  style: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
};

export const HeroImage = ImageTemplate.bind({});

HeroImage.parameters = {
  docs: {
    description: {
      story: `"sizes" attribute explicitly equal to 100vw allowing to skip the default behavior. See DEFAULT_SIZES in the Image component. Load images depending on the viewport width.`,
    },
  },
};

HeroImage.args = {
  src: imageSrc,
  sizes: "100vw",
  style: { aspectRatio: "3/4", objectFit: "cover", width: "100%" },
};
