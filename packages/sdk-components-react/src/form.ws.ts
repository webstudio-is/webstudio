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
  invalidAncestors: ["Form", "Button", "Link"],
  label: "Form",
  description: "Create filters, surveys, searches and more.",
  icon: FormIcon,
  states: defaultStates,
  presetStyle,
  order: 0,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className", "action"],
};
