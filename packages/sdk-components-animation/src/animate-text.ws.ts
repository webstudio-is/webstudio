import { TextIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/animate-text.props";

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  description: "Animate Text",
  icon: TextIcon,
  order: 6,
  label: "Animate Text",
  constraints: [
    { relation: "parent", component: { $eq: "AnimateChildren" } },
    {
      relation: "child",
      text: false,
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["slidingWindow", "easing", "splitBy"],
};
