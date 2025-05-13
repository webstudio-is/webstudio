import {
  PopoverIcon,
  TriggerIcon,
  ContentIcon,
  ButtonElementIcon,
} from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { button, div } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import {
  propsPopover,
  propsPopoverContent,
  propsPopoverTrigger,
  propsPopoverClose,
} from "./__generated__/popover.props";
import { buttonReset } from "./shared/preset-styles";

// @todo add [data-state] to button and link
export const metaPopoverTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
};

export const metaPopoverContent: WsComponentMeta = {
  icon: ContentIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.PopoverClose],
  },
  presetStyle: {
    div,
  },
};

export const metaPopover: WsComponentMeta = {
  icon: PopoverIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.PopoverTrigger, radix.PopoverContent],
  },
};

export const metaPopoverClose: WsComponentMeta = {
  icon: ButtonElementIcon,
  label: "Close Button",
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  states: defaultStates,
  presetStyle: {
    button: [buttonReset, button].flat(),
  },
};

export const propsMetaPopover: WsComponentPropsMeta = {
  props: propsPopover,
  initialProps: ["open"],
};

export const propsMetaPopoverTrigger: WsComponentPropsMeta = {
  props: propsPopoverTrigger,
};

export const propsMetaPopoverContent: WsComponentPropsMeta = {
  props: propsPopoverContent,
  initialProps: ["side", "sideOffset", "align", "alignOffset"],
};

export const propsMetaPopoverClose: WsComponentPropsMeta = {
  props: propsPopoverClose,
  initialProps: [],
};
