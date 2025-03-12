import { SlotComponentIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  description: "Animate Children",
  icon: SlotComponentIcon,
  order: 5,
  label: "Animate Children",
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
