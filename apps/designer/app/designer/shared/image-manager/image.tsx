import { useMemo } from "react";
import { styled } from "@webstudio-is/design-system";
import { Image as WebstudioImage, loaders } from "@webstudio-is/image";
import env from "~/shared/env";
import type { RenderableAsset } from "../assets";

type ImageProps = {
  renderableAsset: RenderableAsset;
  alt: string;
  width: string;
};

const StyledWebstudioImage = styled(WebstudioImage, {
  position: "absolute",
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

export const Image = ({ renderableAsset, alt, width }: ImageProps) => {
  const optimize = renderableAsset.status === "uploaded";
  const asset =
    renderableAsset.status === "uploaded"
      ? renderableAsset.asset
      : renderableAsset.preview;
  const remoteLocation =
    renderableAsset.status === "uploaded" &&
    renderableAsset.asset.location === "REMOTE";

  // Avoid image flickering on switching from preview to asset (during upload)
  const decoding = renderableAsset.preview === undefined ? "async" : "sync";

  const loader = useMemo(() => {
    if (remoteLocation) {
      return loaders.cloudflareImageLoader({
        resizeOrigin: env.RESIZE_ORIGIN,
      });
    }

    return loaders.localImageLoader();
  }, [remoteLocation]);

  return (
    <StyledWebstudioImage
      key={asset.id}
      loader={loader}
      decoding={decoding}
      src={asset.path}
      width={width}
      optimize={optimize}
      alt={alt}
    />
  );
};
