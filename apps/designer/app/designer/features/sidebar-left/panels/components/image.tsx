import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  ProgressBar,
  Tooltip,
} from "~/shared/design-system";
import { useInterval } from "react-use";
import placeholderImage from "~/shared/images/image-placeholder.svg";
import brokenImage from "~/shared/images/broken-image-placeholder.svg";
import { Asset } from "@webstudio-is/prisma-client";
import { useSubmit } from "@remix-run/react";
import { UploadingAsset } from "../../types";
import { Cross2Icon } from "@radix-ui/react-icons";

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
  name,
  id,
}: Asset | UploadingAsset) => {
  const submit = useSubmit();
  const isUploading = status === "uploading";
  const src = useImageWithFallback({ path });
  const [isToolTipOpen, setTolltipOpen] = useState(false);
  const [progressBarPercentage, setProgressBarPercentage] = useState(0);

  // @todo rewrite this fake indication to show real progress
  useInterval(
    () => {
      setProgressBarPercentage((percentage) =>
        percentage < 60 ? percentage + 1 : percentage
      );
    },
    isUploading ? 100 : null
  );

  const deleteAsset = () => {
    const formData = new FormData();
    formData.append("assetId", id);
    formData.append("assetName", name);
    setTolltipOpen(false);
    submit(formData, { method: "delete" });
  };
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
          ...(isUploading ? { filter: "blur(1px)", opacity: 0.7 } : {}),
        }}
      ></Box>
      {!isUploading && (
        <Tooltip
          css={{ maxWidth: "$10" }}
          open={isToolTipOpen}
          multiline
          content={
            <Flex direction="column" gap={1} align="center" justify="center">
              Are you sure you want to delete this asset?
              <Button variant="red" onClick={deleteAsset}>
                Delete
              </Button>
            </Flex>
          }
        >
          <Button
            variant="raw"
            onClick={() => setTolltipOpen(true)}
            css={{
              position: "absolute",
              top: "$1",
              right: "$1",
              cursor: "pointer",
              color: "$highContrast",
            }}
          >
            <Cross2Icon />
          </Button>
        </Tooltip>
      )}
      {isUploading && (
        <ProgressBar
          value={progressBarPercentage}
          max={60}
          css={{ width: "100%", height: "$1" }}
        />
      )}
    </Box>
  );
};
