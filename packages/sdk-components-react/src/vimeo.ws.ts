import type { ComponentProps } from "react";
import { VimeoIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/vimeo.props";
import type { Vimeo } from "./vimeo";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

export const meta: WsComponentMeta = {
  type: "container",
  icon: VimeoIcon,
  states: defaultStates,
  presetStyle,
  constraints: {
    relation: "ancestor",
    component: { $nin: ["Button", "Link", "Heading"] },
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
];

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps,
};
