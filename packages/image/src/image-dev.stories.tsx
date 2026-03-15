// Story for image development, see https://github.com/webstudio-is/webstudio/issues/387

import type * as React from "react";
import { StorySection } from "@webstudio-is/design-system";
import { Image as ImagePrimitive, wsImageLoader } from "./";

// to not allow include local assets everywhere, just enable it for this file
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import localLogoImage from "../storybook-assets/logo.webp";

export default {
  title: "Image dev",
};

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

const ImageBase = (
  args: Omit<ImageProps, "loader"> & {
    style?: React.HTMLAttributes<"img">["style"];
  }
) => {
  const style = {
    maxWidth: "100%",
    display: "block",
    ...args.style,
  };

  return (
    <ImagePrimitive
      {...args}
      optimize={true}
      loader={wsImageLoader}
      style={style}
    />
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ marginTop: 24, marginBottom: 8 }}>{children}</h3>
);

/**
 * All image variants demonstrated together.
 **/
export const ImageDev = () => (
  <StorySection title="Image Dev">
    <SectionTitle>Fixed width image</SectionTitle>
    <p>Load images depending on image width and device per pixel ratio.</p>
    <ImageBase src={imageSrc} width="300" height="400" />

    <SectionTitle>Fixed width image (cover)</SectionTitle>
    <p>
      Preserve ratio using object-fit: cover. Load images depending on image
      width and device per pixel ratio.
    </p>
    <ImageBase
      src={imageSrc}
      width="300"
      height="400"
      style={{ objectFit: "cover" }}
    />

    <SectionTitle>Unknown width image</SectionTitle>
    <p>Load images depending on the viewport width.</p>
    <ImageBase src={imageSrc} />

    <SectionTitle>Aspect ratio image</SectionTitle>
    <p>
      Fit width of the parent container, has own aspect-ratio and
      object-fit=cover. Load images depending on the viewport width.
    </p>
    <div style={{ width: "50%" }}>
      <ImageBase
        src={imageSrc}
        style={{ aspectRatio: "2/1", objectFit: "cover", width: "100%" }}
      />
    </div>

    <SectionTitle>Fill parent image</SectionTitle>
    <p>
      Fill width and height of the relative parent container, object-fit=cover.
      Load images depending on the viewport width.
    </p>
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

    <SectionTitle>Hero image</SectionTitle>
    <p>
      &quot;sizes&quot; attribute explicitly equal to 100vw allowing to skip the
      default behavior. Load images depending on the viewport width.
    </p>
    <ImageBase
      src={imageSrc}
      sizes="100vw"
      style={{
        aspectRatio: "3/1",
        objectFit: "cover",
        width: "100%",
      }}
    />
  </StorySection>
);
