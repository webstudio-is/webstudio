import {
  cssVar,
  rotateBoundedBackgroundHue,
} from "@webstudio-is/design-system";

export const reusableInstanceColor = rotateBoundedBackgroundHue(
  cssVar("--background-accent"),
  55
);
