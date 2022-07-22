import { Asset } from "@webstudio-is/prisma-client";
import { useEffect, useMemo, useState } from "react";
import { Box } from "~/shared/design-system";
import { Image as Thumbnail } from "~/shared/design-system/components/image";
import placholderImage from "~/assets/images/image_place_holder.svg";
import brokenImage from "~/assets/images/broken_image_place_holder.svg";

const getImagePaths = (loadedImage: string) => ({
  loadedImage: loadedImage,
  placeholder: placholderImage,
  error: brokenImage,
});

const useImageWithFallbaack = ({ path }: { path: string }) => {
  const images = useMemo(() => getImagePaths(path), [path]);
  const [imageSrc, setImageSrc] = useState(images.placeholder);

  useEffect(() => {
    const newImage = new Image();
    newImage.src = path;

    newImage.onload = () => setImageSrc(path);
    newImage.onerror = () => setImageSrc(images.error);
  }, [images, path]);

  return {
    imageSrc,
  };
};

export const AssetManagerImage = ({ asset: { path } }: { asset: Asset }) => {
  const { imageSrc } = useImageWithFallbaack({ path });
  return (
    <Box css={{ paddingTop: "100%", position: "relative", aspectRatio: "1/1" }}>
      <Thumbnail
        css={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%) translateX(-50%)",
          left: "50%",
        }}
        src={imageSrc}
      ></Thumbnail>
    </Box>
  );
};
