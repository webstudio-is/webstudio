import { AnimationGroupIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { animation } from "./shared/meta";

export const meta: WsComponentMeta = {
  category: "animations",
  description: "Animation Group component is designed to animate its children.",
  icon: AnimationGroupIcon,
  order: 0,
  label: "Animation Group",
  contentModel: {
    category: "instance",
    children: [
      "instance",
      animation.AnimateText,
      animation.StaggerAnimation,
      animation.VideoAnimation,
    ],
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    action: {
      required: false,
      control: "animationAction",
      type: "animationAction",
      description: "Animation Action",
    },
  },
  initialProps: ["action"],
};
