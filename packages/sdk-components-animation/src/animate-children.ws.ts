import { SlotComponentIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";

export const meta: WsComponentMeta = {
  category: "animations",
  type: "container",
  description:
    "Animation Group component is designed to animate it's children.",
  icon: SlotComponentIcon,
  order: 5,
  label: "Animation Group",
  constraints: {
    relation: "child",
    text: false,
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
