import { TooltipIcon, TriggerIcon, ContentIcon } from "@webstudio-is/icons/svg";
import {
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div } from "@webstudio-is/react-sdk/css-normalize";
import * as tc from "./theme/tailwind-classes";
import {
  propsTooltip,
  propsTooltipContent,
  propsTooltipTrigger,
} from "./__generated__/tooltip.props";
import { getButtonStyles } from "./theme/styles";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

// @todo add [data-state] to button and link
export const metaTooltipTrigger: WsComponentMeta = {
  category: "hidden",
  detachable: false,
  type: "container",
  icon: TriggerIcon,
  stylable: false,
};

export const metaTooltipContent: WsComponentMeta = {
  category: "hidden",
  detachable: false,
  type: "container",
  presetStyle,
  icon: ContentIcon,
};

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/tooltip.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/
export const metaTooltip: WsComponentMeta = {
  category: "radix",
  order: 7,
  type: "container",
  icon: TooltipIcon,
  stylable: false,
  template: [
    {
      type: "instance",
      component: "Tooltip",
      dataSources: {
        tooltipOpen: { type: "variable", initialValue: false },
      },
      props: [
        {
          type: "dataSource",
          name: "open",
          dataSourceName: "tooltipOpen",
        },
        {
          name: "onOpenChange",
          type: "action",
          value: [
            { type: "execute", args: ["open"], code: `tooltipOpen = open` },
          ],
        },
      ],
      children: [
        {
          type: "instance",
          component: "TooltipTrigger",
          children: [
            {
              type: "instance",
              component: "Button",
              styles: getButtonStyles("outline"),
              children: [{ type: "text", value: "Button" }],
            },
          ],
        },
        {
          type: "instance",
          component: "TooltipContent",
          /**
           *  z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md
           **/
          styles: [
            tc.z(50),
            tc.overflow("hidden"),
            tc.rounded("md"),
            tc.border(),
            tc.bg("popover"),
            tc.px(3),
            tc.py(1.5),
            tc.text("sm"),
            tc.text("popoverForeground"),
            tc.shadow("md"),
          ].flat(),
          children: [
            {
              type: "instance",
              component: "Text",
              children: [{ type: "text", value: "The text you can edit" }],
            },
          ],
        },
      ],
    },
  ],
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
