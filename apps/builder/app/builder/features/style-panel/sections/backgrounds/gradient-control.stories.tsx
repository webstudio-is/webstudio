import {
  parseLinearGradient,
  type ParsedGradient,
} from "@webstudio-is/css-data";
import { GradientControl } from "./gradient-control";
import { toValue } from "@webstudio-is/css-engine";

export default {
  title: "Library/GradientControl",
};

export const GradientWithoutAngle = () => {
  return (
    <GradientControl
      gradient={
        parseLinearGradient(
          "linear-gradient(#e66465 0%, #9198e5 100%)"
        ) as ParsedGradient
      }
      onChange={() => {}}
    />
  );
};

// The GradientControl is to just modify the stop values or add new ones.
// It always shows the angle as 90deg, unless the stops can't be showin in a rectangle.
// So, the gradient shouldn't modify even if the stop values are changed at the end,
export const GradientWithAngle = () => {
  return (
    <GradientControl
      gradient={
        parseLinearGradient(
          "linear-gradient(145deg, #ff00fa 0%, #00f497 34% 34%, #ffa800 56% 56%, #00eaff 100%)"
        ) as ParsedGradient
      }
      onChange={(value) => {
        if (toValue(value.angle) !== "145deg") {
          throw new Error(
            `Gradient control modified the angle that is passed. \nReceived ${JSON.stringify(value.angle, null, 2)}`
          );
        }
      }}
    />
  );
};

export const GradientWithSideOrCorner = () => {
  return (
    <GradientControl
      gradient={
        parseLinearGradient(
          "linear-gradient(to left top, blue 0%, red 100%)"
        ) as ParsedGradient
      }
      onChange={(value) => {
        if (toValue(value.sideOrCorner) !== "to left top") {
          throw new Error(
            `Gradient control modified the side-or-corner value that is passed. \nReceived ${JSON.stringify(value.sideOrCorner, null, 2)}`
          );
        }
      }}
    />
  );
};
