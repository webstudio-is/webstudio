import { useEffect, useState } from "react";
import { ProgressRadial, styled } from "@webstudio-is/design-system";

const useFakeProgress = () => {
  const [progressBarPercentage, setProgressBarPercentage] = useState(0);

  // @todo rewrite this fake indication to show real progress
  useEffect(() => {
    const intervalId = setInterval(() => {
      setProgressBarPercentage((percentage) =>
        percentage < 60 ? percentage + 1 : 0
      );
    }, 100);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return progressBarPercentage;
};

const AnimationContainer = styled("div", {
  position: "absolute",
  top: 0,
  left: 0,
  height: "100%",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  pointerEvents: "none",
});

export const UploadingAnimation = () => {
  const progressBarPercentage = useFakeProgress();
  return (
    <AnimationContainer>
      <ProgressRadial value={progressBarPercentage} max={60} />
    </AnimationContainer>
  );
};
