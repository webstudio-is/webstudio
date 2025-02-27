import { parseCssValue } from "@webstudio-is/css-data";
import type { ViewAnimation } from "@webstudio-is/sdk";

const newViewAnimation: ViewAnimation = {
  name: "New Animation",
  description: "Create a new animation.",

  timing: {
    rangeStart: ["cover", { type: "unit", value: 0, unit: "%" }],
    rangeEnd: ["cover", { type: "unit", value: 100, unit: "%" }],
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
const newFadeInViewAnimation: ViewAnimation = {
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

const newFadeOutViewAnimation: ViewAnimation = {
  name: "Fade Out",
  description: "Fade out the element as it scrolls out of view.",

  timing: {
    rangeStart: ["exit", { type: "unit", value: 0, unit: "%" }],
    rangeEnd: ["exit", { type: "unit", value: 100, unit: "%" }],
    fill: "forwards",
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

const newFlyInViewAnimation: ViewAnimation = {
  name: "Fly In",
  description: "Fly in the element as it scrolls into view.",

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
        translate: parseCssValue("translate", "0 100px"),
      },
    },
  ],
};

const newFlyOutViewAnimation: ViewAnimation = {
  name: "Fly Out",
  description: "Fly out the element as it scrolls out of view.",

  timing: {
    rangeStart: ["exit", { type: "unit", value: 0, unit: "%" }],
    rangeEnd: ["exit", { type: "unit", value: 100, unit: "%" }],
    fill: "forwards",
    easing: "linear",
  },
  keyframes: [
    {
      offset: 1,
      styles: {
        translate: parseCssValue("translate", "0 -100px"),
      },
    },
  ],
};

const newWipeInViewAnimation: ViewAnimation = {
  name: "Wipe In",
  description: "Wipe in the element as it scrolls into view.",

  timing: {
    rangeStart: ["contain", { type: "unit", value: 0, unit: "%" }],
    rangeEnd: ["contain", { type: "unit", value: 50, unit: "%" }],
    fill: "backwards",
    easing: "linear",
  },
  keyframes: [
    {
      offset: 0,
      styles: {
        "clip-path": parseCssValue("clipPath", "inset(0 100% 0 0)"),
      },
    },
    {
      offset: 1,
      styles: {
        "clip-path": parseCssValue("clipPath", "inset(0 0 0 0)"),
      },
    },
  ],
};

const newWipeOutViewAnimation: ViewAnimation = {
  name: "Wipe Out",
  description: "Wipe out the element as it scrolls out of view.",

  timing: {
    rangeStart: ["contain", { type: "unit", value: 50, unit: "%" }],
    rangeEnd: ["contain", { type: "unit", value: 100, unit: "%" }],
    fill: "forwards",
    easing: "linear",
  },
  keyframes: [
    {
      offset: 0,
      styles: {
        "clip-path": parseCssValue("clipPath", "inset(0 0 0 0)"),
      },
    },

    {
      offset: 1,
      styles: {
        "clip-path": parseCssValue("clipPath", "inset(0 0 0 100%)"),
      },
    },
  ],
};

const newParallaxInAnimation: ViewAnimation = {
  name: "Parallax In",
  description: "Parallax the element as it scrolls out of view.",

  timing: {
    rangeStart: ["cover", { type: "unit", value: 0, unit: "%" }],
    rangeEnd: ["cover", { type: "unit", value: 50, unit: "%" }],
    fill: "backwards",
    easing: "linear",
  },
  keyframes: [
    {
      offset: 0,
      styles: {
        translate: parseCssValue("translate", "0 100px"),
      },
    },
  ],
};

const newParallaxOutAnimation: ViewAnimation = {
  name: "Parallax Out",
  description: "Parallax the element as it scrolls out of view.",

  timing: {
    rangeStart: ["cover", { type: "unit", value: 50, unit: "%" }],
    rangeEnd: ["cover", { type: "unit", value: 100, unit: "%" }],
    fill: "forwards",
    easing: "linear",
  },
  keyframes: [
    {
      offset: 1,
      styles: {
        translate: parseCssValue("translate", "0 -100px"),
      },
    },
  ],
};

export const newViewAnimations = [
  newViewAnimation,
  newFadeInViewAnimation,
  newFadeOutViewAnimation,
  newFlyInViewAnimation,
  newFlyOutViewAnimation,
  newWipeInViewAnimation,
  newWipeOutViewAnimation,
  newParallaxInAnimation,
  newParallaxOutAnimation,
];
