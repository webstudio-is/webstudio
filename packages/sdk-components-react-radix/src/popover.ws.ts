import { PopoverIcon, TriggerIcon, ContentIcon } from "@webstudio-is/icons/svg";
import {
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import * as tc from "./theme/tailwind-classes";
import { getButtonStyles } from "./theme/styles";
import {
  propsPopover,
  propsPopoverContent,
  propsPopoverTrigger,
} from "./__generated__/popover.props";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

// @todo add [data-state] to button and link
export const metaPopoverTrigger: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: TriggerIcon,
  stylable: false,
  constraints: {
    relation: "ancestor",
    component: { $eq: "Popover" },
  },
};

export const metaPopoverContent: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle,
  icon: ContentIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "Popover" },
  },
};

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/popover.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/
export const metaPopover: WsComponentMeta = {
  category: "radix",
  order: 6,
  type: "container",
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
  icon: PopoverIcon,
  stylable: false,
  description: "Displays rich content in a portal, triggered by a button.",
  template: [
    {
      type: "instance",
      component: "Popover",
      props: [],
      children: [
        {
          type: "instance",
          component: "PopoverTrigger",
          children: [
            {
              type: "instance",
              component: "Button",
              styles: getButtonStyles("outline"),
              children: [{ type: "text", value: "Button", placeholder: true }],
            },
          ],
        },
        {
          type: "instance",
          component: "PopoverContent",
          /**
           *  z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none
           **/
          styles: [
            tc.z(50),
            tc.w(72),
            tc.rounded("md"),
            tc.border(),
            tc.bg("popover"),
            tc.p(4),
            tc.text("popoverForeground"),
            tc.shadow("md"),
            tc.outline("none"),
          ].flat(),
          children: [
            {
              type: "instance",
              component: "Text",
              children: [
                {
                  type: "text",
                  value: "The text you can edit",
                  placeholder: true,
                },
              ],
            },
          ],
        },
      ],
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
