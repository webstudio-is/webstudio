import { SelectIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { select } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./select";
import { props } from "./__generated__/select.props";

const presetStyle = {
  select: [
    ...select,
    {
      property: "display",
      value: { type: "keyword", value: "block" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  constraints: {
    relation: "ancestor",
    component: { $nin: ["Button", "Link"] },
  },
  type: "container",
  description:
    "A drop-down menu for users to select a single option from a predefined list.",
  icon: SelectIcon,
  presetStyle,
  order: 4,
  states: [
    ...defaultStates,
    { selector: "::placeholder", label: "Placeholder" },
    { selector: ":valid", label: "Valid" },
    { selector: ":invalid", label: "Invalid" },
    { selector: ":required", label: "Required" },
    { selector: ":optional", label: "Optional" },
  ],
  template: [
    {
      type: "instance",
      component: "Select",
      label: "Select",
      children: [
        {
          type: "instance",
          component: "Option",
          label: "Option",
          props: [
            { type: "string", name: "label", value: "Please choose an option" },
            { type: "string", name: "value", value: "" },
          ],
          children: [],
        },
        {
          type: "instance",
          component: "Option",
          label: "Option",
          props: [
            { type: "string", name: "label", value: "Option A" },
            { type: "string", name: "value", value: "a" },
          ],
          children: [],
        },
        {
          type: "instance",
          component: "Option",
          label: "Option",
          props: [
            { type: "string", name: "label", value: "Option B" },
            { type: "string", name: "value", value: "b" },
          ],
          children: [],
        },
        {
          type: "instance",
          component: "Option",
          label: "Option",
          props: [
            { type: "string", name: "label", value: "Option C" },
            { type: "string", name: "value", value: "c" },
          ],
          children: [],
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [
    "id",
    "className",
    "name",
    "value",
    "multiple",
    "required",
    "autoFocus",
  ],
};
