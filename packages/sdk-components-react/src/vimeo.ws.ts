import type { ComponentProps } from "react";
import { VimeoIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/vimeo.props";
import type { Vimeo } from "./vimeo";

export const meta: WsComponentMeta = {
  type: "container",
  icon: VimeoIcon,
  states: defaultStates,
  contentModel: {
    category: "instance",
    children: [
      "instance",
      "VimeoSpinner",
      "VimeoPlayButton",
      "VimeoPreviewImage",
    ],
  },
  presetStyle: {
    div,
  },
};

const initialProps: Array<keyof ComponentProps<typeof Vimeo>> = [
  "id",
  "className",
  "url",
  "title",
  "quality",
  "loading",
  "showPreview",
  "autoplay",
  "doNotTrack",
  "loop",
  "muted",
  "showPortrait",
  "showByline",
  "showTitle",
  "showControls",
  "controlsColor",
  "playsinline",
];

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps,
};
