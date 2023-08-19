import { LabelIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { label } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/label.props";
import * as tc from "./theme/tailwind-classes";

const presetStyle = {
  label,
} satisfies PresetStyle<"label">;

export const meta: WsComponentMeta = {
  category: "radix",
  order: 102,
  type: "container",
  icon: LabelIcon,
  presetStyle,
  states: defaultStates,
  template: [
    {
      type: "instance",
      component: "Label",
      styles: [
        // text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70
        tc.text("sm"),
        tc.font("medium"),
        tc.leading("none"),
        // We are not supporting peer like styles yet
      ].flat(),
      children: [{ type: "text", value: "Form Label" }],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    htmlFor: {
      ...props.htmlFor,
      label: "For",
    },
  },
  initialProps: ["id", "htmlFor"],
};
