import { PopoverIcon, TriggerIcon, ContentIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import {
  propsPopover,
  propsPopoverContent,
  propsPopoverTrigger,
} from "./__generated__/popover.props";

// @todo add [data-state] to button and link
export const metaPopoverTrigger: WsComponentMeta = {
  type: "container",
  icon: TriggerIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "Popover" },
  },
};

export const metaPopoverContent: WsComponentMeta = {
  type: "container",
  presetStyle: {
    div,
  },
  icon: ContentIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "Popover" },
  },
};

export const metaPopover: WsComponentMeta = {
  type: "container",
  icon: PopoverIcon,
  constraints: [
    {
      relation: "descendant",
      component: { $eq: "PopoverTrigger" },
    },
    {
      relation: "descendant",
      component: { $eq: "PopoverContent" },
    },
  ],
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
