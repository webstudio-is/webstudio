import { RadioCheckedIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import * as tc from "./theme/tailwind-classes";
import {
  propsPopover,
  propsPopoverContent,
  propsPopoverTrigger,
} from "./__generated__/popover.props";

// @todo add [data-state] to button and link
export const metaPopoverTrigger: WsComponentMeta = {
  category: "hidden",
  invalidAncestors: [],
  type: "container",
  label: "PopoverTrigger",
  icon: RadioCheckedIcon,
  stylable: false,
  detachable: false,
};

export const metaPopoverContent: WsComponentMeta = {
  category: "hidden",
  invalidAncestors: [],
  type: "container",
  label: "PopoverContent",
  icon: RadioCheckedIcon,
  detachable: false,
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
  invalidAncestors: [],
  type: "container",
  label: "Popover",
  icon: RadioCheckedIcon,
  order: 15,
  stylable: false,
  template: [
    {
      type: "instance",
      component: "Popover",
      label: "Popover",
      props: [
        {
          name: "isOpen",
          // We don't have support for boolean or undefined, instead of binding on open we bind on a string
          type: "string",
          value: "initial",
          dataSourceRef: {
            type: "variable",
            name: "isOpen",
          },
        },
      ],
      children: [
        {
          type: "instance",
          component: "PopoverTrigger",
          props: [],
          children: [
            {
              type: "instance",
              component: "Button",
              children: [{ type: "text", value: "Button" }],
            },
          ],
        },
        {
          type: "instance",
          component: "PopoverContent",
          label: "Popover Content",
          props: [],
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
              children: [{ type: "text", value: "The text you can edit" }],
            },
          ],
        },
      ],
    },
  ],
};

export const propsMetaPopover: WsComponentPropsMeta = {
  props: propsPopover,
  initialProps: ["isOpen", "modal"],
};

export const propsMetaPopoverTrigger: WsComponentPropsMeta = {
  props: propsPopoverTrigger,
};

export const propsMetaPopoverContent: WsComponentPropsMeta = {
  props: propsPopoverContent,
  initialProps: ["side", "sideOffset", "align", "alignOffset"],
};
