import { SwitchIcon, TriggerIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
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
    { label: "Checked", selector: "[data-state=checked]" },
    { label: "Unchecked", selector: "[data-state=unchecked]" },
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
    { label: "Checked", selector: "[data-state=checked]" },
    { label: "Unchecked", selector: "[data-state=unchecked]" },
  ],
  presetStyle: {
    span,
  },
  props: propsSwitchThumb,
};
