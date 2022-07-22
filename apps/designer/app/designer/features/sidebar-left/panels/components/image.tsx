import { Asset } from "@webstudio-is/prisma-client";
import { useEffect, useMemo, useState } from "react";
import { Box } from "~/shared/design-system";
import placholderImage from "~/shared/images/image-placeholder.svg";
import brokenImage from "~/shared/images/broken-image-placeholder.svg";

const useImageWithFallbaack = ({ path }: { path: string }) => {
  const [src, setSrc] = useState(placholderImage);

  useEffect(() => {
    const newImage = new Image();
    newImage.src = path;

    newImage.onload = () => setSrc(path);
    newImage.onerror = () => setSrc(brokenImage);
  }, [path]);

  return src;
};

export const AssetManagerImage = ({
  asset: { path, alt },
}: {
  asset: Asset;
}) => {
  const src = useImageWithFallbaack({ path });
  return (
    <Box
      title={alt || ""}
      css={{
        aspectRatio: "1/1",
        width: "100%",
        height: "100%",
        backgroundImage: `url(${src})`,
        backgroundSize: "contain",
      }}
    ></Box>
  );
};
