import type { ComponentProps } from "react";
import { LottiePlayerIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/lottie-player.props";
import type { LottiePlayer } from "./lottie-player";

const initialProps: Array<keyof ComponentProps<typeof LottiePlayer>> = [
  "id",
  "className",
  "src",
  "previewOnCanvas",
  "behavior",
  "speed",
  "playReverse",
  "openAtPercent",
];

export const meta: WsComponentMeta = {
  icon: LottiePlayerIcon,
  contentModel: {
    category: "instance",
    children: [],
  },
  presetStyle: { div },
  initialProps,
  props: {
    ...props,
    behavior: {
      ...props.behavior,
      label: "Behavior",
    },
    playReverse: {
      ...props.playReverse,
      label: "Play reverse",
    },
    openAtPercent: {
      ...props.openAtPercent,
      label: "Open at",
    },
    isOpen: {
      ...props.isOpen,
      label: "Is open",
    },
    previewOnCanvas: {
      ...props.previewOnCanvas,
      label: "Play on canvas",
    },
    src: {
      ...props.src,
      label: "Source",
      control: "file",
      accept: "application/json",
      contentMode: true,
    },
  },
};
