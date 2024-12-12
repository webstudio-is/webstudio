import { SwitchIcon, TriggerIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { button, span } from "@webstudio-is/sdk/normalize.css";
import * as tc from "./theme/tailwind-classes";
import { buttonReset } from "./theme/styles";
import { propsSwitch, propsSwitchThumb } from "./__generated__/switch.props";

export const metaSwitch: WsComponentMeta = {
  category: "radix",
  order: 11,
  type: "container",
  constraints: {
    relation: "descendant",
    component: { $eq: "SwitchThumb" },
  },
  description:
    "A control that allows the user to toggle between checked and not checked.",
  icon: SwitchIcon,
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
      component: "Switch",
      variables: {
        switchChecked: { initialValue: false },
      },
      props: [
        {
          name: "checked",
          type: "expression",
          code: "switchChecked",
        },
        {
          name: "onCheckedChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["checked"],
              code: `switchChecked = checked`,
            },
          ],
        },
      ],
      // peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors
      // focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
      // disabled:cursor-not-allowed disabled:opacity-50
      // data-[state=checked]:bg-primary
      // data-[state=unchecked]:bg-input
      styles: [
        // We are not supporting peer like styles yet
        tc.inlineFlex(),
        tc.property("height", "24px"),
        tc.property("width", "44px"),
        tc.shrink(0),
        tc.cursor("pointer"),
        tc.items("center"),
        tc.rounded("full"),
        tc.border(2),
        tc.border("transparent"),
        tc.transition("all"),
        tc.focusVisible(
          [tc.outline("none"), tc.ring("ring", 2, "background", 2)].flat()
        ),
        tc.disabled([tc.cursor("not-allowed"), tc.opacity(50)].flat()),
        tc.state([tc.bg("primary")].flat(), "[data-state=checked]"),
        tc.state([tc.bg("input")].flat(), "[data-state=unchecked]"),
      ].flat(),
      children: [
        {
          type: "instance",
          component: "SwitchThumb",
          // pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform
          // data-[state=checked]:translate-x-5
          // data-[state=unchecked]:translate-x-0
          styles: [
            tc.pointerEvents("none"),
            tc.block(),
            tc.h(5),
            tc.w(5),
            tc.rounded("full"),
            tc.bg("background"),
            tc.shadow("lg"),
            tc.transition("transform"),
            tc.state(
              [tc.property("transform", "translateX(20px)")].flat(),
              "[data-state=checked]"
            ),
            tc.state(
              [tc.property("transform", "translateX(0px)")].flat(),
              "[data-state=unchecked]"
            ),
          ].flat(),
          children: [],
        },
      ],
    },
  ],
};

export const metaSwitchThumb: WsComponentMeta = {
  category: "hidden",
  type: "container",
  constraints: {
    relation: "ancestor",
    component: { $eq: "Switch" },
  },
  icon: TriggerIcon,
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
    span,
  },
};

export const propsMetaSwitch: WsComponentPropsMeta = {
  props: propsSwitch,
  initialProps: ["id", "className", "name", "value", "checked", "required"],
};

export const propsMetaSwitchThumb: WsComponentPropsMeta = {
  props: propsSwitchThumb,
};
