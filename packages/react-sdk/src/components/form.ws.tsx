import { FormIcon } from "@webstudio-is/icons/svg";
import { form } from "../css/normalize";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
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
  label: "Form",
  icon: FormIcon,
  states: defaultStates,
  presetStyle,
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
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
