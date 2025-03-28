import { TextAnimationIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/stagger-animation.props";

export const meta: WsComponentMeta = {
  category: "animations",
  type: "container",
  description:
    "Stagger animation allows you to animate children elements with a sliding window.",
  icon: TextAnimationIcon,
  order: 6,
  label: "Stagger Animation",
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
  initialProps: ["slidingWindow", "easing"],
};
