import { ItemIcon, RadioGroupIcon, TriggerIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { button, div, span } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import { buttonReset } from "./shared/preset-styles";
import {
  propsRadioGroup,
  propsRadioGroupIndicator,
  propsRadioGroupItem,
} from "./__generated__/radio-group.props";

export const metaRadioGroup: WsComponentMeta = {
  icon: RadioGroupIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.RadioGroupItem],
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
    div,
  },
};

export const metaRadioGroupItem: WsComponentMeta = {
  icon: ItemIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.RadioGroupIndicator],
  },
  states: defaultStates,
  presetStyle: {
    button: [button, buttonReset].flat(),
  },
};

export const metaRadioGroupIndicator: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
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
