import { CheckboxCheckedIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
  type PresetStyle,
  defaultStates,
} from "./component-meta";
import { props } from "./__generated__/checkbox-field.props";
import type { defaultTag } from "./checkbox-field";
import { label } from "../css/normalize";

const presetStyle = {
  label: [
    ...label,
    { property: "display", value: { type: "keyword", value: "flex" } },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
  label: "Checkbox",
  icon: CheckboxCheckedIcon,
  states: defaultStates,
  presetStyle,
  template: [
    {
      type: "instance",
      component: "CheckboxField",
      children: [
        { type: "instance", component: "Checkbox", children: [] },
        {
          type: "instance",
          component: "TextBlock",
          label: "Checkbox Label",
          props: [],
          children: [{ type: "text", value: "Checkbox" }],
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
