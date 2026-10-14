import { animationCanPlayOnCanvasProperty } from "@webstudio-is/sdk/runtime";
import { AnimationGroupIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { getAnimationComponentId } from "./shared/component-id";

export const meta: WsComponentMeta = {
  selectionReveal: {
    type: "fixed",
    ancestor: "self",
    selectedOnly: true,
    prop: animationCanPlayOnCanvasProperty,
    value: true,
  },
  category: "animations",
  description: "Animation Group component is designed to animate its children.",
  icon: AnimationGroupIcon,
  order: 0,
  label: "Animation Group",
  contentModel: {
    category: "instance",
    children: [
      "instance",
      getAnimationComponentId("AnimateText"),
      getAnimationComponentId("StaggerAnimation"),
      getAnimationComponentId("VideoAnimation"),
    ],
  },
  initialProps: ["action"],
  props: {
    action: {
      required: false,
      control: "animationAction",
      type: "animationAction",
      description: "Animation Action",
    },
  },
};
