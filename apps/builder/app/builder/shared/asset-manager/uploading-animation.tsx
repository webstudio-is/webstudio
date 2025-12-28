import { rawTheme, styled } from "@webstudio-is/design-system";
import { SpinnerIcon } from "@webstudio-is/icons";

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
  return (
    <AnimationContainer>
      <SpinnerIcon size={rawTheme.spacing[15]} />
    </AnimationContainer>
  );
};
