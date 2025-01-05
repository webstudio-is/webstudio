import { ItemIcon, RadioGroupIcon, TriggerIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { button, div, span } from "@webstudio-is/sdk/normalize.css";
import { buttonReset } from "./shared/preset-styles";
import {
  propsRadioGroup,
  propsRadioGroupIndicator,
  propsRadioGroupItem,
} from "./__generated__/radio-group.props";

export const metaRadioGroup: WsComponentMeta = {
  type: "container",
  constraints: {
    relation: "descendant",
    component: { $eq: "RadioGroupItem" },
  },
  icon: RadioGroupIcon,
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
