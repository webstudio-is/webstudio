import { FormIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { form } from "@webstudio-is/react-sdk/css-normalize";
import type { defaultTag } from "./form";
import { props } from "./__generated__/form.props";

const presetStyle = {
  form: [
    ...form,
    { property: "minHeight", value: { type: "unit", unit: "px", value: 20 } },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
  invalidAncestors: ["Form"],
  label: "Form",
  icon: FormIcon,
  states: defaultStates,
  presetStyle,
  order: 0,
  template: [
    {
      type: "instance",
      component: "Form",
      children: [
        {
          type: "instance",
          component: "Label",
          children: [{ type: "text", value: "Name" }],
        },
        {
          type: "instance",
          component: "Input",
          props: [{ type: "string", name: "name", value: "name" }],
          children: [],
        },
        {
          type: "instance",
          component: "Label",
          children: [{ type: "text", value: "Email" }],
        },
        {
          type: "instance",
          component: "Input",
          props: [{ type: "string", name: "name", value: "email" }],
          children: [],
        },
        {
          type: "instance",
          component: "Button",
          children: [{ type: "text", value: "Submit" }],
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
