import { CheckboxCheckedIcon, TriggerIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
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

export const metaCheckboxIndicator: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  states: defaultStates,
  presetStyle: {
    span,
  },
};

export const propsMetaCheckbox: WsComponentPropsMeta = {
  props: propsCheckbox,
  initialProps: ["id", "className", "name", "value", "required", "checked"],
};

export const propsMetaCheckboxIndicator: WsComponentPropsMeta = {
  props: propsCheckboxIndicator,
};
