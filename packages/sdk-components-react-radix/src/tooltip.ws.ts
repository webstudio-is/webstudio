import { TooltipIcon, TriggerIcon, ContentIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import {
  propsTooltip,
  propsTooltipContent,
  propsTooltipTrigger,
} from "./__generated__/tooltip.props";

export const metaTooltipTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  states: [
    { label: "Closed", selector: '[data-state="closed"]' },
    { label: "Delayed open", selector: '[data-state="delayed-open"]' },
    { label: "Instant open", selector: '[data-state="instant-open"]' },
  ],
  props: propsTooltipTrigger,
};

export const metaTooltipContent: WsComponentMeta = {
  icon: ContentIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  states: [
    { label: "Closed", selector: '[data-state="closed"]' },
    { label: "Delayed open", selector: '[data-state="delayed-open"]' },
    { label: "Instant open", selector: '[data-state="instant-open"]' },
  ],
  presetStyle: { div },
  initialProps: ["side", "sideOffset", "align", "alignOffset"],
  props: propsTooltipContent,
};

export const metaTooltip: WsComponentMeta = {
  icon: TooltipIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.TooltipTrigger, radix.TooltipContent],
  },
  initialProps: ["open", "delayDuration", "disableHoverableContent"],
  props: propsTooltip,
};
