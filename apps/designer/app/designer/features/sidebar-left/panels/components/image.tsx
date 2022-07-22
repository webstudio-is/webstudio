import { Asset } from "@webstudio-is/prisma-client";
import { useEffect, useMemo, useState } from "react";
import { Box } from "~/shared/design-system";
import placholderImage from "~/shared/images/image-placeholder.svg";
import brokenImage from "~/shared/images/broken-image-placeholder.svg";

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
    <Box
      css={{
        aspectRatio: "1/1",
        width: "100%",
        height: "100%",
        backgroundImage: `url(${imageSrc})`,
        backgroundSize: "contain",
      }}
    ></Box>
  );
};
