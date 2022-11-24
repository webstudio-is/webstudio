import { ProgressRadial, styled } from "@webstudio-is/design-system";

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

const AnimationContainer = styled("div", {
  position: "absolute",
  top: 0,
  left: 0,
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
});

export const UploadingAnimation = () => {
  const progressBarPercentage = useFakeProgress();
  return (
    <AnimationContainer>
      <ProgressRadial value={progressBarPercentage} max={60} />
    </AnimationContainer>
  );
};
