import { TooltipIcon, TriggerIcon, ContentIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import {
  propsTooltip,
  propsTooltipContent,
  propsTooltipTrigger,
} from "./__generated__/tooltip.props";

// @todo add [data-state] to button and link
export const metaTooltipTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
};

export const metaTooltipContent: WsComponentMeta = {
  icon: ContentIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  presetStyle: {
    div,
  },
};

export const metaTooltip: WsComponentMeta = {
  icon: TooltipIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.TooltipTrigger, radix.TooltipContent],
  },
};

export const propsMetaTooltip: WsComponentPropsMeta = {
  props: propsTooltip,
  initialProps: ["open", "delayDuration", "disableHoverableContent"],
};

export const propsMetaTooltipTrigger: WsComponentPropsMeta = {
  props: propsTooltipTrigger,
};

export const propsMetaTooltipContent: WsComponentPropsMeta = {
  props: propsTooltipContent,
  initialProps: ["side", "sideOffset", "align", "alignOffset"],
};
