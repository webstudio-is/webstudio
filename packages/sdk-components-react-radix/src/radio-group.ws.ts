import {
  ItemIcon,
  RadioCheckedIcon,
  RadioDotIcon,
  TriggerIcon,
} from "@webstudio-is/icons/svg";
import {
  defaultStates,
  WsEmbedTemplate,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { button, div, span } from "@webstudio-is/sdk/normalize.css";
import * as tc from "./theme/tailwind-classes";
import { buttonReset } from "./theme/styles";
import {
  propsRadioGroup,
  propsRadioGroupIndicator,
  propsRadioGroupItem,
} from "./__generated__/radio-group.props";

const createRadioGroupItem = ({
  value,
  label,
}: {
  value: string;
  label: string;
}): WsEmbedTemplate[number] => ({
  type: "instance",
  component: "Label",
  // flex items-center space-x-2
  styles: [tc.flex(), tc.items("center"), tc.gap(2)].flat(),
  children: [
    {
      type: "instance",
      component: "RadioGroupItem",
      props: [{ name: "value", type: "string", value }],
      // aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background
      // focus:outline-none
      // focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      // disabled:cursor-not-allowed disabled:opacity-50
      styles: [
        tc.aspect("square"),
        tc.h(4),
        tc.w(4),
        tc.rounded("full"),
        tc.border(),
        tc.border("primary"),
        tc.text("primary"),
        tc.focusVisible(
          [tc.outline("none"), tc.ring("ring", 2, "background", 2)].flat()
        ),
        tc.disabled([tc.cursor("not-allowed"), tc.opacity(50)].flat()),
      ].flat(),
      children: [
        {
          type: "instance",
          component: "RadioGroupIndicator",
          children: [
            {
              type: "instance",
              component: "HtmlEmbed",
              label: "Indicator Icon",
              props: [
                {
                  type: "string",
                  name: "code",
                  value: RadioDotIcon,
                },
              ],
              children: [],
            },
          ],
        },
      ],
    },
    {
      type: "instance",
      component: "Text",
      children: [{ type: "text", value: label, placeholder: true }],
    },
  ],
});

export const metaRadioGroup: WsComponentMeta = {
  category: "radix",
  order: 100,
  type: "container",
  constraints: {
    relation: "descendant",
    component: { $eq: "RadioGroupItem" },
  },
  description:
    "A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time.",
  icon: RadioCheckedIcon,
  states: [
    ...defaultStates,
    {
      label: "Checked",
      selector: "[data-state=checked]",
      category: "component-states",
    },
    {
      label: "Unchecked",
      selector: "[data-state=unchecked]",
      category: "component-states",
    },
  ],
  presetStyle: {
    div,
  },
  template: [
    {
      type: "instance",
      component: "RadioGroup",
      variables: {
        radioGroupValue: { initialValue: "" },
      },
      // grid gap-2
      styles: [tc.flex(), tc.flex("col"), tc.gap(2)].flat(),
      props: [
        {
          type: "expression",
          name: "value",
          code: "radioGroupValue",
        },
        {
          name: "onValueChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: `radioGroupValue = value`,
            },
          ],
        },
      ],
      children: [
        createRadioGroupItem({ value: "default", label: "Default" }),
        createRadioGroupItem({ value: "comfortable", label: "Comfortable" }),
        createRadioGroupItem({ value: "compact", label: "Compact" }),
      ],
    },
  ],
};

export const metaRadioGroupItem: WsComponentMeta = {
  category: "hidden",
  type: "container",
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: "RadioGroup" },
    },
    {
      relation: "descendant",
      component: { $eq: "RadioGroupIndicator" },
    },
  ],
  icon: ItemIcon,
  states: defaultStates,
  presetStyle: {
    button: [button, buttonReset].flat(),
  },
};

export const metaRadioGroupIndicator: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: TriggerIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "RadioGroupItem" },
  },
  states: defaultStates,
  presetStyle: {
    span,
  },
};

export const propsMetaRadioGroup: WsComponentPropsMeta = {
  props: propsRadioGroup,
  initialProps: ["id", "className", "name", "value", "required"],
};

export const propsMetaRadioGroupItem: WsComponentPropsMeta = {
  props: propsRadioGroupItem,
  initialProps: ["value"],
};

export const propsMetaRadioGroupIndicator: WsComponentPropsMeta = {
  props: propsRadioGroupIndicator,
};
