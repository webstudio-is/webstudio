import { SwitchIcon, TriggerIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { button, span } from "@webstudio-is/sdk/normalize.css";
import { buttonReset } from "./shared/preset-styles";
import { propsSwitch, propsSwitchThumb } from "./__generated__/switch.props";

export const metaSwitch: WsComponentMeta = {
  type: "container",
  constraints: {
    relation: "descendant",
    component: { $eq: "SwitchThumb" },
  },
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
};

export const metaSwitchThumb: WsComponentMeta = {
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
