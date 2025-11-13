import {
  PopoverIcon,
  TriggerIcon,
  ContentIcon,
  ButtonElementIcon,
} from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
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
  props: propsPopoverTrigger,
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
  initialProps: ["side", "sideOffset", "align", "alignOffset"],
  props: propsPopoverContent,
};

export const metaPopover: WsComponentMeta = {
  icon: PopoverIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.PopoverTrigger, radix.PopoverContent],
  },
  initialProps: ["open"],
  props: propsPopover,
};

export const metaPopoverClose: WsComponentMeta = {
  icon: ButtonElementIcon,
  label: "Close Button",
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: {
    button: [buttonReset, button].flat(),
  },
  props: propsPopoverClose,
};
