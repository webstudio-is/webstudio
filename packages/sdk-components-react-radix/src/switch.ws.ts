import { SwitchIcon, TriggerIcon } from "@webstudio-is/icons/svg";
import { defaultStates, type WsComponentMeta } from "@webstudio-is/sdk";
import { button, span } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import { buttonReset } from "./shared/preset-styles";
import { propsSwitch, propsSwitchThumb } from "./__generated__/switch.props";

export const metaSwitch: WsComponentMeta = {
  icon: SwitchIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.SwitchThumb],
  },
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
  initialProps: ["id", "class", "name", "value", "checked", "required"],
  props: propsSwitch,
};

export const metaSwitchThumb: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
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
  props: propsSwitchThumb,
};
