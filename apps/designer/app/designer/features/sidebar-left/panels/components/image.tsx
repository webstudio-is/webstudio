import { useEffect, useState } from "react";
import { Box, ProgressBar } from "~/shared/design-system";
import { useInterval } from "react-use";
import placeholderImage from "~/shared/images/image-placeholder.svg";
import brokenImage from "~/shared/images/broken-image-placeholder.svg";
import { Asset } from "@webstudio-is/prisma-client";

const useImageWithFallback = ({ path }: { path: string }) => {
  const [src, setSrc] = useState(placeholderImage);

  useEffect(() => {
    const newImage = new Image();
    newImage.onload = () => setSrc(path);
    newImage.onerror = () => setSrc(brokenImage);
    newImage.src = path;
  }, [path]);

  return src;
};

export const AssetManagerImage = ({
  path,
  alt,
  status,
}: {
  path: string;
  alt?: string;
  status?: Asset["status"];
}) => {
  const uploading = status === "uploading";
  const src = useImageWithFallback({ path });
  const [progressBarPercentage, setProgressBarPercentage] = useState(0);

  @todo rewrite this fake indication to show real progress
  useInterval(
    () => {
      setProgressBarPercentage((percentage) =>
        percentage < 60 ? percentage + 1 : percentage
      );
    },
    uploading ? 100 : null
  );

  return (
    <Box
      title={alt || ""}
      css={{
        aspectRatio: "1/1",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 $2",
        position: "relative",
      }}
    >
      <Box
        css={{
          backgroundImage: `url("${src}")`,
          width: "100%",
          height: "100%",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          position: "absolute",
          left: 0,
          top: 0,
          ...(uploading ? { filter: "blur(1px)", opacity: 0.7 } : {}),
        }}
      ></Box>
      {uploading && (
        <ProgressBar
          value={progressBarPercentage}
          max={60}
          css={{ width: "100%", height: "$1" }}
        />
      )}
    </Box>
  );
};
