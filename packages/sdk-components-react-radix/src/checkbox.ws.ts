import { CheckboxCheckedIcon, TriggerIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { button, span } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import { buttonReset } from "./shared/preset-styles";
import {
  propsCheckbox,
  propsCheckboxIndicator,
} from "./__generated__/checkbox.props";

export const metaCheckbox: WsComponentMeta = {
  icon: CheckboxCheckedIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.CheckboxIndicator],
  },
  states: [
    { label: "Checked", selector: "[data-state=checked]" },
    { label: "Unchecked", selector: "[data-state=unchecked]" },
  ],
  presetStyle: {
    button: [button, buttonReset].flat(),
  },
  initialProps: ["id", "class", "name", "value", "required", "checked"],
  props: propsCheckbox,
};

export const metaCheckboxIndicator: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: {
    span,
  },
  props: propsCheckboxIndicator,
};
