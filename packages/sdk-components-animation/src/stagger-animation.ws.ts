import { StaggerAnimationIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/stagger-animation.props";

export const meta: WsComponentMeta = {
  category: "animations",
  type: "container",
  description:
    "Stagger animation allows you to animate children elements with a sliding window.",
  icon: StaggerAnimationIcon,
  order: 6,
  label: "Stagger Animation",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  presetStyle: {
    div,
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["slidingWindow", "easing"],
};
