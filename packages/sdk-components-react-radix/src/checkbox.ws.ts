import {
  CheckMarkIcon,
  CheckboxCheckedIcon,
  TriggerIcon,
} from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { button, span } from "@webstudio-is/react-sdk/css-normalize";
import * as tc from "./theme/tailwind-classes";
import { buttonReset } from "./theme/styles";
import {
  propsCheckbox,
  propsCheckboxIndicator,
} from "./__generated__/checkbox.props";

export const metaCheckbox: WsComponentMeta = {
  category: "radix",
  order: 101,
  type: "container",
  icon: CheckboxCheckedIcon,
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
    button: [button, buttonReset].flat(),
  },
  template: [
    {
      type: "instance",
      component: "Label",
      label: "Checkbox Field",
      styles: [tc.flex(), tc.gap(2), tc.items("center")].flat(),
      children: [
        {
          type: "instance",
          component: "Checkbox",
          dataSources: {
            checkboxChecked: { type: "variable", initialValue: false },
          },
          props: [
            {
              name: "checked",
              type: "dataSource",
              dataSourceName: "checkboxChecked",
            },
            {
              name: "onCheckedChange",
              type: "action",
              value: [
                {
                  type: "execute",
                  args: ["checked"],
                  code: `checkboxChecked = checked`,
                },
              ],
            },
          ],
          // peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background
          // focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          // disabled:cursor-not-allowed disabled:opacity-50
          // data-[state=checked]:bg-primary
          // data-[state=checked]:text-primary-foreground",
          styles: [
            // We are not supporting peer like styles yet
            tc.h(4),
            tc.w(4),
            tc.shrink(0),
            tc.rounded("sm"),
            tc.border(),
            tc.border("primary"),
            tc.focusVisible(
              [tc.outline("none"), tc.ring("ring", 2, "background", 2)].flat()
            ),
            tc.disabled([tc.cursor("not-allowed"), tc.opacity(50)].flat()),
            tc.state(
              [tc.bg("primary"), tc.text("primaryForeground")].flat(),
              "[data-state=checked]"
            ),
          ].flat(),
          children: [
            {
              type: "instance",
              component: "CheckboxIndicator",
              // flex items-center justify-center text-current
              styles: [
                tc.flex(),
                tc.items("center"),
                tc.justify("center"),
                tc.text("current"),
              ].flat(),
              children: [
                {
                  type: "instance",
                  component: "HtmlEmbed",
                  label: "Indicator Icon",
                  props: [
                    {
                      type: "string",
                      name: "code",
                      value: CheckMarkIcon,
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
          label: "Checkbox Label",
          props: [{ name: "tag", type: "string", value: "span" }],
          children: [{ type: "text", value: "Checkbox" }],
        },
      ],
    },
  ],
};

export const metaCheckboxIndicator: WsComponentMeta = {
  category: "hidden",
  type: "container",
  detachable: false,
  icon: TriggerIcon,
  states: defaultStates,
  presetStyle: {
    span,
  },
};

export const propsMetaCheckbox: WsComponentPropsMeta = {
  props: propsCheckbox,
  initialProps: ["id", "checked", "name", "required"],
};

export const propsMetaCheckboxIndicator: WsComponentPropsMeta = {
  props: propsCheckboxIndicator,
};
