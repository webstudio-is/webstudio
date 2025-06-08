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
import type { WsComponentMeta } from "@webstudio-is/sdk";
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
  icon: SelectIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.SelectTrigger, radix.SelectContent],
  },
  initialProps: ["name", "value", "open", "required"],
  props: propsSelect,
};

export const metaSelectTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.SelectValue],
  },
  presetStyle: { button },
  props: propsSelectTrigger,
};

export const metaSelectValue: WsComponentMeta = {
  label: "Value",
  icon: FormTextFieldIcon,
  contentModel: {
    category: "none",
    children: [],
  },
  presetStyle: { span },
  initialProps: ["placeholder"],
  props: propsSelectValue,
};

export const metaSelectContent: WsComponentMeta = {
  icon: ContentIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.SelectViewport],
  },
  presetStyle: { div },
  props: propsSelectContent,
};

export const metaSelectViewport: WsComponentMeta = {
  icon: ViewportIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.SelectItem],
  },
  presetStyle: { div },
  props: propsSelectViewport,
};

export const metaSelectItem: WsComponentMeta = {
  icon: ItemIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.SelectItemIndicator, radix.SelectItemText],
  },
  presetStyle: { div },
  initialProps: ["value"],
  props: propsSelectItem,
};

export const metaSelectItemIndicator: WsComponentMeta = {
  label: "Indicator",
  icon: CheckMarkIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  presetStyle: { span },
  props: propsSelectItemIndicator,
};

export const metaSelectItemText: WsComponentMeta = {
  label: "Item Text",
  icon: TextIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: { span },
  props: propsSelectItemText,
};
