import { ProgressRadial } from "@webstudio-is/design-system";

import { useState } from "react";
import { useInterval } from "react-use";

const useFakeProgress = ({
  isUploading,
  isDeleting,
}: {
  isUploading: boolean;
  isDeleting: boolean;
}) => {
  const [progressBarPercentage, setProgressBarPercentage] = useState(0);

  // @todo rewrite this fake indication to show real progress
  useInterval(
    () => {
      setProgressBarPercentage((percentage) =>
        percentage < 60 ? percentage + 1 : percentage
      );
    },
    isUploading || isDeleting ? 100 : null
  );

  return progressBarPercentage;
};

export const UploadingAnimation = ({
  isUploading,
  isDeleting,
}: {
  isUploading: boolean;
  isDeleting: boolean;
}) => {
  const progressBarPercentage = useFakeProgress({ isUploading, isDeleting });
  return (
    <ProgressRadial
      css={{ position: "relative", zIndex: 10 }}
      value={progressBarPercentage}
      max={60}
    />
  );
};
