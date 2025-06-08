import type { ComponentProps } from "react";
import { VimeoIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/vimeo.props";
import type { Vimeo } from "./vimeo";

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

export const meta: WsComponentMeta = {
  icon: VimeoIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: ["VimeoSpinner", "VimeoPlayButton", "VimeoPreviewImage"],
  },
  presetStyle: { div },
  initialProps,
  props,
};
