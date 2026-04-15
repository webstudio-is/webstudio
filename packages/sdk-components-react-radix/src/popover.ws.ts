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

export const metaPopoverTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  states: [
    { label: "Open", selector: '[data-state="open"]' },
    { label: "Closed", selector: '[data-state="closed"]' },
  ],
  props: propsPopoverTrigger,
};

export const metaPopoverContent: WsComponentMeta = {
  icon: ContentIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.PopoverClose],
  },
  states: [
    { label: "Open", selector: '[data-state="open"]' },
    { label: "Closed", selector: '[data-state="closed"]' },
  ],
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
