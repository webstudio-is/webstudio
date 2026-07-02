import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  behavior: {
    description: "loop, toggle on click, or toggle on hover.",
    required: false,
    control: "radio",
    type: "string",
    options: ["loop", "toggle on click", "toggle on hover"],
    defaultValue: "loop",
  },
  playReverse: {
    description: "Play the animation in reverse (loop mode only).",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  speed: {
    description: "Playback speed. 1 = normal, 2 = double.",
    required: false,
    control: "number",
    type: "number",
    defaultValue: 1,
  },
  previewOnCanvas: {
    description: "Play the animation on the canvas in the builder.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
  src: {
    description: "URL to a Lottie JSON file.",
    required: false,
    control: "text",
    type: "string",
  },
  isOpen: {
    description: "Controlled open/closed state for toggle and hover modes.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
};
