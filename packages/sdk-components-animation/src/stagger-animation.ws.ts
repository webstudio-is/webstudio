import { StaggerAnimationIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { animation } from "./shared/meta";
import { props } from "./__generated__/stagger-animation.props";

export const meta: WsComponentMeta = {
  category: "animations",
  type: "container",
  description:
    "Stagger animation allows you to animate children elements with a sliding window.",
  icon: StaggerAnimationIcon,
  order: 6,
  label: "Stagger Animation",
  constraints: [
    { relation: "parent", component: { $eq: animation.AnimateChildren } },
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
