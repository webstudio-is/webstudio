import { TextAnimationIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/animate-text.props";

export const meta: WsComponentMeta = {
  category: "animations",
  description:
    "Text animation allows you to split text by char or by word to animate it.",
  icon: TextAnimationIcon,
  order: 1,
  label: "Text Animation",
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
  initialProps: ["slidingWindow", "easing", "splitBy"],
};
