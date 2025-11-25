import { parseCssValue } from "@webstudio-is/css-data";
import type { EventAnimation } from "@webstudio-is/sdk";

export const newEventAnimations: EventAnimation[] = [
  {
    name: "Fade In",
    description: "Smoothly fade in an element when triggered",
    timing: {
      duration: { type: "unit", value: 300, unit: "ms" },
      fill: "both",
      easing: "ease-in-out",
      direction: "normal",
      iterations: 1,
    },
    keyframes: [
      {
        offset: 0,
        styles: {
          opacity: parseCssValue("opacity", "0"),
        },
      },
      {
        offset: 1,
        styles: {
          opacity: parseCssValue("opacity", "1"),
        },
      },
    ],
  },
  {
    name: "Scale Up",
    description: "Scale up element from small to normal size",
    timing: {
      duration: { type: "unit", value: 250, unit: "ms" },
      fill: "both",
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      direction: "normal",
      iterations: 1,
    },
    keyframes: [
      {
        offset: 0,
        styles: {
          transform: parseCssValue("transform", "scale(0.8)"),
          opacity: parseCssValue("opacity", "0"),
        },
      },
      {
        offset: 1,
        styles: {
          transform: parseCssValue("transform", "scale(1)"),
          opacity: parseCssValue("opacity", "1"),
        },
      },
    ],
  },
  {
    name: "Slide In From Left",
    description: "Slide element in from the left side",
    timing: {
      duration: { type: "unit", value: 400, unit: "ms" },
      fill: "both",
      easing: "ease-out",
      direction: "normal",
      iterations: 1,
    },
    keyframes: [
      {
        offset: 0,
        styles: {
          transform: parseCssValue("transform", "translateX(-100%)"),
          opacity: parseCssValue("opacity", "0"),
        },
      },
      {
        offset: 1,
        styles: {
          transform: parseCssValue("transform", "translateX(0)"),
          opacity: parseCssValue("opacity", "1"),
        },
      },
    ],
  },
  {
    name: "Rotate In",
    description: "Rotate element into view with a spin effect",
    timing: {
      duration: { type: "unit", value: 500, unit: "ms" },
      fill: "both",
      easing: "ease-in-out",
      direction: "normal",
      iterations: 1,
    },
    keyframes: [
      {
        offset: 0,
        styles: {
          transform: parseCssValue("transform", "rotate(-180deg) scale(0)"),
          opacity: parseCssValue("opacity", "0"),
        },
      },
      {
        offset: 1,
        styles: {
          transform: parseCssValue("transform", "rotate(0deg) scale(1)"),
          opacity: parseCssValue("opacity", "1"),
        },
      },
    ],
  },
  {
    name: "Bounce",
    description: "Playful bounce animation",
    timing: {
      duration: { type: "unit", value: 600, unit: "ms" },
      fill: "both",
      easing: "linear",
      direction: "normal",
      iterations: 1,
    },
    keyframes: [
      {
        offset: 0,
        styles: {
          transform: parseCssValue("transform", "translateY(0)"),
        },
      },
      {
        offset: 0.2,
        styles: {
          transform: parseCssValue("transform", "translateY(-30px)"),
        },
      },
      {
        offset: 0.5,
        styles: {
          transform: parseCssValue("transform", "translateY(0)"),
        },
      },
      {
        offset: 0.7,
        styles: {
          transform: parseCssValue("transform", "translateY(-15px)"),
        },
      },
      {
        offset: 1,
        styles: {
          transform: parseCssValue("transform", "translateY(0)"),
        },
      },
    ],
  },
  {
    name: "Shake",
    description: "Attention-grabbing shake effect",
    timing: {
      duration: { type: "unit", value: 400, unit: "ms" },
      fill: "both",
      easing: "linear",
      direction: "normal",
      iterations: 1,
    },
    keyframes: [
      {
        offset: 0,
        styles: {
          transform: parseCssValue("transform", "translateX(0)"),
        },
      },
      {
        offset: 0.1,
        styles: {
          transform: parseCssValue("transform", "translateX(-10px)"),
        },
      },
      {
        offset: 0.3,
        styles: {
          transform: parseCssValue("transform", "translateX(10px)"),
        },
      },
      {
        offset: 0.5,
        styles: {
          transform: parseCssValue("transform", "translateX(-10px)"),
        },
      },
      {
        offset: 0.7,
        styles: {
          transform: parseCssValue("transform", "translateX(10px)"),
        },
      },
      {
        offset: 0.9,
        styles: {
          transform: parseCssValue("transform", "translateX(-5px)"),
        },
      },
      {
        offset: 1,
        styles: {
          transform: parseCssValue("transform", "translateX(0)"),
        },
      },
    ],
  },
  {
    name: "Custom Animation",
    description: "Start with a blank animation to create your own",
    timing: {
      duration: { type: "unit", value: 300, unit: "ms" },
      fill: "both",
      easing: "ease",
      direction: "normal",
      iterations: 1,
    },
    keyframes: [
      {
        offset: 0,
        styles: {},
      },
      {
        offset: 1,
        styles: {},
      },
    ],
  },
];
