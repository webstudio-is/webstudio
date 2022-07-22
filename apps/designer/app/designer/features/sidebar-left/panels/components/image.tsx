import { Asset } from "@webstudio-is/prisma-client";
import { useEffect, useState } from "react";
import { Box } from "~/shared/design-system";
import placholderImage from "~/shared/images/image-placeholder.svg";
import brokenImage from "~/shared/images/broken-image-placeholder.svg";

const useImageWithFallback = ({ path }: { path: string }) => {
  const [src, setSrc] = useState(placholderImage);

  useEffect(() => {
    const newImage = new Image();
    newImage.onload = () => setSrc(path);
    newImage.onerror = () => setSrc(brokenImage);
    newImage.src = path;
  }, [path]);

  return src;
};

export const AssetManagerImage = ({
  asset: { path, alt },
}: {
  asset: Asset;
}) => {
  const src = useImageWithFallback({ path });
  return (
    <Box
      title={alt || ""}
      css={{
        aspectRatio: "1/1",
        backgroundImage: `url(${src})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    ></Box>
  );
};
