import { parseCssValue } from "@webstudio-is/css-data";
import type { ScrollAnimation } from "@webstudio-is/sdk";

const newScrollAnimation: ScrollAnimation = {
  name: "New Animation",
  description: "Create a new animation.",

  timing: {
    rangeStart: ["start", { type: "unit", value: 0, unit: "px" }],
    rangeEnd: ["end", { type: "unit", value: 0, unit: "px" }],
    fill: "both",
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
const newFadeInScrollAnimation: ScrollAnimation = {
  name: "Fade In",
  description: "Fade in the element as it scrolls into view.",

  timing: {
    rangeStart: ["start", { type: "unit", value: 0, unit: "%" }],
    rangeEnd: ["start", { type: "unit", value: 50, unit: "dvh" }],
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

const newFadeOutScrollAnimation: ScrollAnimation = {
  name: "Fade Out",
  description: "Fade out the element as it scrolls out of view.",

  timing: {
    rangeStart: ["end", { type: "unit", value: 50, unit: "dvh" }],
    rangeEnd: ["end", { type: "unit", value: 0, unit: "%" }],
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

export const newScrollAnimations = [
  newScrollAnimation,
  newFadeInScrollAnimation,
  newFadeOutScrollAnimation,
];
