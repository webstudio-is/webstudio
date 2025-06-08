import { StaggerAnimationIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/stagger-animation.props";

export const meta: WsComponentMeta = {
  category: "animations",
  description:
    "Stagger animation allows you to animate children elements with a sliding window.",
  icon: StaggerAnimationIcon,
  order: 4,
  label: "Stagger Animation",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  presetStyle: { div },
  initialProps: ["slidingWindow", "easing"],
  props,
};
