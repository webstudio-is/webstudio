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
  icon: SelectIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.SelectTrigger, radix.SelectContent],
  },
};

export const metaSelectTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.SelectValue],
  },
  presetStyle: {
    button,
  },
};

export const metaSelectValue: WsComponentMeta = {
  label: "Value",
  icon: FormTextFieldIcon,
  contentModel: {
    category: "none",
    children: [],
  },
  presetStyle: {
    span,
  },
};

export const metaSelectContent: WsComponentMeta = {
  icon: ContentIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.SelectViewport],
  },
  presetStyle: {
    div,
  },
};

export const metaSelectViewport: WsComponentMeta = {
  icon: ViewportIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.SelectItem],
  },
  presetStyle: {
    div,
  },
};

export const metaSelectItem: WsComponentMeta = {
  icon: ItemIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.SelectItemIndicator, radix.SelectItemText],
  },
  presetStyle: {
    div,
  },
};

export const metaSelectItemIndicator: WsComponentMeta = {
  label: "Indicator",
  icon: CheckMarkIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  presetStyle: {
    span,
  },
};

export const metaSelectItemText: WsComponentMeta = {
  label: "Item Text",
  icon: TextIcon,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
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
