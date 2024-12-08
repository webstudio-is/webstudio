import { ButtonElementIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { button } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/button.props";
import type { defaultTag } from "./button";

const presetStyle = {
  button,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
  constraints: {
    relation: "ancestor",
    component: { $nin: ["Button", "Link"] },
  },
  description:
    "Use a button to submit forms or trigger actions within a page. Do not use a button to navigate users to another resource or another page - that’s what a link is used for.",
  icon: ButtonElementIcon,
  presetStyle,
  states: [
    ...defaultStates,
    { selector: ":disabled", label: "Disabled" },
    { selector: ":enabled", label: "Enabled" },
  ],
  order: 2,
  template: [
    {
      type: "instance",
      component: "Button",
      children: [
        {
          type: "text",
          value: "Button text you can edit",
          placeholder: true,
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className", "type", "aria-label"],
};
