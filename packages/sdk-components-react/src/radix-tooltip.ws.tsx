import { RadioCheckedIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import * as variables from "./theme/radix-variables";

import {
  propsTooltip,
  propsTooltipContent,
  propsTooltipTrigger,
} from "./__generated__/radix-tooltip.props";

// @todo add [data-state] to button and link
export const metaTooltipTrigger: WsComponentMeta = {
  category: "hidden",
  invalidAncestors: [],
  type: "container",
  label: "TooltipTrigger",
  icon: RadioCheckedIcon,
  stylable: false,
};

export const metaTooltipContent: WsComponentMeta = {
  category: "hidden",
  invalidAncestors: [],
  type: "container",
  label: "TooltipContent",
  icon: RadioCheckedIcon,
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
  invalidAncestors: [],
  type: "container",
  label: "Tooltip",
  icon: RadioCheckedIcon,
  order: 15,
  stylable: false,
  template: [
    {
      type: "instance",
      component: "Tooltip",
      label: "Tooltip",
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
          component: "TooltipTrigger",
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
          component: "TooltipContent",
          label: "Tooltip Content",
          props: [],
          // z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md
          styles: [
            // z-50
            {
              property: "zIndex",
              value: { type: "unit", unit: "number", value: 50 },
            },
            // overflow-hidden
            {
              property: "overflow",
              value: { type: "keyword", value: "hidden" },
            },
            // rounded-md
            {
              property: "borderTopLeftRadius",
              value: variables.radius,
            },
            {
              property: "borderTopRightRadius",
              value: variables.radius,
            },
            {
              property: "borderBottomRightRadius",
              value: variables.radius,
            },
            {
              property: "borderBottomLeftRadius",
              value: variables.radius,
            },
            // border
            {
              property: "borderTopWidth",
              value: { type: "unit", unit: "px", value: 1 },
            },
            {
              property: "borderRightWidth",
              value: { type: "unit", unit: "px", value: 1 },
            },
            {
              property: "borderBottomWidth",
              value: { type: "unit", unit: "px", value: 1 },
            },
            {
              property: "borderLeftWidth",
              value: { type: "unit", unit: "px", value: 1 },
            },
            {
              property: "borderTopStyle",
              value: { type: "keyword", value: "solid" },
            },
            {
              property: "borderRightStyle",
              value: { type: "keyword", value: "solid" },
            },
            {
              property: "borderBottomStyle",
              value: { type: "keyword", value: "solid" },
            },
            {
              property: "borderLeftStyle",
              value: { type: "keyword", value: "solid" },
            },

            // * { border-color: hsl(var(--border)); }
            {
              property: "borderTopColor",
              value: variables.border,
            },
            {
              property: "borderRightColor",
              value: variables.border,
            },
            {
              property: "borderBottomColor",
              value: variables.border,
            },
            {
              property: "borderLeftColor",
              value: variables.border,
            },
            // bg-popover
            {
              property: "backgroundColor",
              value: variables.popover,
            },
            // px-3
            {
              property: "paddingLeft",
              value: { type: "unit", unit: "rem", value: 0.75 },
            },
            {
              property: "paddingRight",
              value: { type: "unit", unit: "rem", value: 0.75 },
            },
            // py-1.5
            {
              property: "paddingTop",
              value: { type: "unit", unit: "rem", value: 0.375 },
            },
            {
              property: "paddingBottom",
              value: { type: "unit", unit: "rem", value: 0.375 },
            },
            // text-popover-foreground
            {
              property: "color",
              value: variables.popoverForeground,
            },
            // text-sm
            {
              property: "fontSize",
              value: { type: "unit", unit: "rem", value: 0.875 },
            },
            {
              property: "lineHeight",
              value: { type: "unit", unit: "rem", value: 1.25 },
            },
            // shadow-md
            // --tw-shadow: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)
            // box-shadow: var(--tw-shadow)
            {
              property: "boxShadow",
              value: {
                type: "layers",

                value: [
                  {
                    type: "tuple",
                    value: [
                      { type: "unit", unit: "px", value: 0 },
                      { type: "unit", unit: "px", value: 4 },
                      { type: "unit", unit: "px", value: 6 },
                      { type: "unit", unit: "px", value: -1 },
                      { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
                    ],
                  },
                  {
                    type: "tuple",
                    value: [
                      { type: "unit", unit: "px", value: 0 },
                      { type: "unit", unit: "px", value: 2 },
                      { type: "unit", unit: "px", value: 4 },
                      { type: "unit", unit: "px", value: -2 },
                      { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
                    ],
                  },
                ],
              },
            },
          ],
          children: [
            {
              type: "instance",
              component: "Box",
              props: [],
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
    },
  ],
};

export const propsMetaTooltip: WsComponentPropsMeta = {
  props: propsTooltip,
  initialProps: ["isOpen", "delayDuration", "disableHoverableContent"],
};

export const propsMetaTooltipTrigger: WsComponentPropsMeta = {
  props: propsTooltipTrigger,
};

export const propsMetaTooltipContent: WsComponentPropsMeta = {
  props: propsTooltipContent,
  initialProps: ["side", "sideOffset", "align", "alignOffset"],
};
