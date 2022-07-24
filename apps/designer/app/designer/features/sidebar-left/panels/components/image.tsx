import { useEffect, useState } from "react";
import { Box, ProgressBar } from "~/shared/design-system";
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
  path,
  alt,
  uploading,
}: {
  path: string;
  alt?: string;
  uploading?: boolean;
}) => {
  const src = useImageWithFallback({ path });
  const [progressBarPercentage, setProgressBarPercentage] = useState(0);

  useEffect(() => {
    setInterval(() => {
      if (progressBarPercentage < 60) {
        setProgressBarPercentage((percentage) => percentage + 1);
      }
    }, 100);
  }, []);

  return (
    <Box
      title={alt || ""}
      css={{
        aspectRatio: "1/1",
        backgroundImage: `url(${src})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 $2",
      }}
    >
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
