import { ProgressRadial } from "@webstudio-is/design-system";

import { useState } from "react";
import { useInterval } from "react-use";

const useFakeProgress = () => {
  const [progressBarPercentage, setProgressBarPercentage] = useState(0);

  // @todo rewrite this fake indication to show real progress
  useInterval(() => {
    setProgressBarPercentage((percentage) =>
      percentage < 60 ? percentage + 1 : percentage
    );
  }, 100);

  return progressBarPercentage;
};

export const UploadingAnimation = () => {
  const progressBarPercentage = useFakeProgress();
  return (
    <ProgressRadial
      css={{ position: "relative", zIndex: 10 }}
      value={progressBarPercentage}
      max={60}
    />
  );
};
