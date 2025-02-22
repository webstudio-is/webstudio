import { parseCssValue } from "@webstudio-is/css-data";
import type { ViewAnimation } from "@webstudio-is/sdk";

export const newViewAnimation: ViewAnimation = {
  name: "New Animation",
  description: "Create a new animation.",

  timing: {
    rangeStart: ["entry", { type: "unit", value: 0, unit: "%" }],
    rangeEnd: ["entry", { type: "unit", value: 100, unit: "%" }],
    fill: "backwards",
    easing: "linear",
  },
  keyframes: [
    {
      offset: 0,
      styles: {},
    },
  ],
};

// @todo: visit https://github.com/argyleink/open-props/blob/main/src/props.animations.css
export const newFadeInViewAnimation: ViewAnimation = {
  name: "Fade In",
  description: "Fade in the element as it scrolls into view.",

  timing: {
    rangeStart: ["entry", { type: "unit", value: 0, unit: "%" }],
    rangeEnd: ["entry", { type: "unit", value: 100, unit: "%" }],
    fill: "backwards",
    easing: "linear",
  },
  keyframes: [
    {
      offset: 0,
      styles: {
        opacity: parseCssValue("opacity", "0"),
      },
    },
  ],
};

export const newFadeOutViewAnimation: ViewAnimation = {
  name: "Fade Out",
  description: "Fade out the element as it scrolls out of view.",

  timing: {
    rangeStart: ["exit", { type: "unit", value: 0, unit: "%" }],
    rangeEnd: ["exit", { type: "unit", value: 100, unit: "%" }],
    fill: "backwards",
    easing: "linear",
  },
  keyframes: [
    {
      offset: 1,
      styles: {
        opacity: parseCssValue("opacity", "0"),
      },
    },
  ],
};
