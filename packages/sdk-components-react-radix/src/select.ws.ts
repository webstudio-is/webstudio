import {
  SelectIcon,
  TriggerIcon,
  FormTextFieldIcon,
  ContentIcon,
  ItemIcon,
  ViewportIcon,
  TextIcon,
  CheckMarkIcon,
} from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { button, div, span } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import {
  propsSelect,
  propsSelectContent,
  propsSelectItem,
  propsSelectItemIndicator,
  propsSelectItemText,
  propsSelectTrigger,
  propsSelectValue,
  propsSelectViewport,
} from "./__generated__/select.props";

export const metaSelect: WsComponentMeta = {
  type: "container",
  icon: SelectIcon,
  constraints: [
    {
      relation: "descendant",
      component: { $eq: radix.SelectTrigger },
    },
    {
      relation: "descendant",
      component: { $eq: radix.SelectContent },
    },
  ],
};

export const metaSelectTrigger: WsComponentMeta = {
  type: "container",
  icon: TriggerIcon,
  presetStyle: {
    button,
  },
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: radix.Select },
    },
    {
      relation: "descendant",
      component: { $eq: radix.SelectValue },
    },
  ],
};

export const metaSelectValue: WsComponentMeta = {
  type: "container",
  label: "Value",
  icon: FormTextFieldIcon,
  presetStyle: {
    span,
  },
  constraints: {
    relation: "ancestor",
    component: { $eq: radix.SelectTrigger },
  },
};

export const metaSelectContent: WsComponentMeta = {
  type: "container",
  icon: ContentIcon,
  presetStyle: {
    div,
  },
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: radix.Select },
    },
    {
      relation: "descendant",
      component: { $eq: radix.SelectViewport },
    },
  ],
};

export const metaSelectViewport: WsComponentMeta = {
  type: "container",
  icon: ViewportIcon,
  presetStyle: {
    div,
  },
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: radix.SelectContent },
    },
    {
      relation: "descendant",
      component: { $eq: radix.SelectItem },
    },
  ],
};

export const metaSelectItem: WsComponentMeta = {
  type: "container",
  icon: ItemIcon,
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: radix.SelectViewport },
    },
    {
      relation: "descendant",
      component: { $eq: radix.SelectItemIndicator },
    },
    {
      relation: "descendant",
      component: { $eq: radix.SelectItemText },
    },
  ],
  presetStyle: {
    div,
  },
};

export const metaSelectItemIndicator: WsComponentMeta = {
  type: "container",
  label: "Indicator",
  icon: CheckMarkIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: radix.SelectItem },
  },
  presetStyle: {
    span,
  },
};

export const metaSelectItemText: WsComponentMeta = {
  type: "container",
  label: "Item Text",
  icon: TextIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: radix.SelectItem },
  },
  presetStyle: {
    span,
  },
};

export const propsMetaSelect: WsComponentPropsMeta = {
  props: propsSelect,
  initialProps: ["name", "value", "open", "required"],
};

export const propsMetaSelectTrigger: WsComponentPropsMeta = {
  props: propsSelectTrigger,
};

export const propsMetaSelectValue: WsComponentPropsMeta = {
  props: propsSelectValue,
  initialProps: ["placeholder"],
};

export const propsMetaSelectContent: WsComponentPropsMeta = {
  props: propsSelectContent,
};

export const propsMetaSelectViewport: WsComponentPropsMeta = {
  props: propsSelectViewport,
};

export const propsMetaSelectItem: WsComponentPropsMeta = {
  props: propsSelectItem,
  initialProps: ["value"],
};

export const propsMetaSelectItemIndicator: WsComponentPropsMeta = {
  props: propsSelectItemIndicator,
};

export const propsMetaSelectItemText: WsComponentPropsMeta = {
  props: propsSelectItemText,
};
