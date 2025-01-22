import { TooltipIcon, TriggerIcon, ContentIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import {
  propsTooltip,
  propsTooltipContent,
  propsTooltipTrigger,
} from "./__generated__/tooltip.props";

// @todo add [data-state] to button and link
export const metaTooltipTrigger: WsComponentMeta = {
  type: "container",
  icon: TriggerIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "Tooltip" },
  },
};

export const metaTooltipContent: WsComponentMeta = {
  type: "container",
  icon: ContentIcon,
  presetStyle: {
    div,
  },
  constraints: {
    relation: "ancestor",
    component: { $eq: "Tooltip" },
  },
};

export const metaTooltip: WsComponentMeta = {
  type: "container",
  constraints: [
    {
      relation: "descendant",
      component: { $eq: "TooltipTrigger" },
    },
    {
      relation: "descendant",
      component: { $eq: "TooltipContent" },
    },
  ],
  icon: TooltipIcon,
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
