import { TextAnimationIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { animation } from "./shared/meta";
import { props } from "./__generated__/animate-text.props";

export const meta: WsComponentMeta = {
  category: "animations",
  type: "container",
  description:
    "Text animation allows you to split text by char or by word to animate it.",
  icon: TextAnimationIcon,
  order: 6,
  label: "Text Animation",
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
  initialProps: ["slidingWindow", "easing", "splitBy"],
};
