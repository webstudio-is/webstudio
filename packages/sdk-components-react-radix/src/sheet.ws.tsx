import {
  HamburgerMenuIcon,
  TriggerIcon,
  ContentIcon,
  OverlayIcon,
  HeadingIcon,
  TextIcon,
  ButtonElementIcon,
} from "@webstudio-is/icons/svg";
import {
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import * as tc from "./theme/tailwind-classes";
import {
  propsSheet,
  propsSheetContent,
  propsSheetTrigger,
  propsSheetOverlay,
  propsSheetClose,
  propsSheetTitle,
  propsSheetDescription,
} from "./__generated__/sheet.props";
import { div, nav, button, h2, p } from "@webstudio-is/react-sdk/css-normalize";
import type { SheetContent } from "./sheet";
import type { ComponentProps } from "react";
import { template as buttonTemplate } from "./button.ws";

type ContentTags = NonNullable<ComponentProps<typeof SheetContent>["tag"]>;

const contentPresetStyle = {
  div,
  nav,
} satisfies PresetStyle<ContentTags>;

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

const buttonPresetStyle = {
  button,
} satisfies PresetStyle<"button">;

const titlePresetStyle = {
  h2,
} satisfies PresetStyle<"h2">;

const descriptionPresetStyle = {
  p,
} satisfies PresetStyle<"p">;

// @todo add [data-state] to button and link
export const metaSheetTrigger: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: TriggerIcon,
  stylable: false,
  detachable: false,
};

export const metaSheetContent: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: ContentIcon,
  detachable: false,
  presetStyle: contentPresetStyle,
  states: [
    { selector: "[data-side=top]", label: "Top Side" },
    { selector: "[data-side=right]", label: "Right Side" },
    { selector: "[data-side=bottom]", label: "Bottom Side" },
    { selector: "[data-side=left]", label: "Left Side" },
  ],
};

export const metaSheetOverlay: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle,
  icon: OverlayIcon,
  detachable: false,
};

export const metaSheetTitle: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle: titlePresetStyle,
  icon: HeadingIcon,
};

export const metaSheetDescription: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle: descriptionPresetStyle,
  icon: TextIcon,
};

export const metaSheetClose: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle: buttonPresetStyle,
  icon: ButtonElementIcon,
};

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/sheet.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/
export const metaSheet: WsComponentMeta = {
  category: "radix",
  order: 1,
  type: "container",
  icon: HamburgerMenuIcon,
  stylable: false,
  template: [
    {
      type: "instance",
      component: "Sheet",
      dataSources: {
        sheetOpen: { type: "variable", initialValue: false },
      },
      props: [
        {
          type: "dataSource",
          name: "open",
          dataSourceName: "sheetOpen",
        },
        {
          name: "onOpenChange",
          type: "action",
          value: [
            { type: "execute", args: ["open"], code: `sheetOpen = open` },
          ],
        },
      ],
      children: [
        {
          type: "instance",
          component: "SheetTrigger",
          children: buttonTemplate({
            props: [
              { name: "variant", type: "string", value: "ghost" },
              { name: "size", type: "string", value: "icon" },
            ],
            children: [
              {
                type: "instance",
                component: "HtmlEmbed",
                label: "Hamburger Menu Svg",
                props: [
                  {
                    type: "string",
                    name: "code",
                    value: HamburgerMenuIcon,
                  },
                ],
                children: [],
              },
            ],
          }),
        },
        {
          type: "instance",
          component: "SheetOverlay",
          /**
           * fixed inset-0 z-50 bg-background/80 backdrop-blur-sm
           * flex
           **/
          styles: [
            tc.fixed(),
            tc.inset(0),
            tc.z(50),
            tc.bg("background", 80),
            tc.backdropBlur("sm"),
            // To allow positioning Content
            tc.flex(),
            tc.flex("col"),
            tc.overflow("auto"),
          ].flat(),
          children: [
            {
              type: "instance",
              component: "SheetContent",
              /**
               * fixed w-full z-50
               * grid gap-4 max-w-lg
               * m-auto
               * border bg-background p-6 shadow-lg
               **/
              styles: [
                tc.w("full"),
                tc.z(50),
                tc.flex(),
                tc.flex("col"),
                tc.gap(4),
                tc.border(),
                tc.bg("background"),
                tc.p(6),
                tc.shadow("lg"),
                tc.relative(),
                tc.state(
                  [tc.mr("auto"), tc.maxW("sm"), tc.grow()].flat(),
                  "[data-side=left]"
                ),
                tc.state(
                  [tc.ml("auto"), tc.maxW("sm"), tc.grow()].flat(),
                  "[data-side=right]"
                ),
                tc.state([tc.mb("auto")].flat(), "[data-side=top]"),
                tc.state([tc.mt("auto")].flat(), "[data-side=bottom]"),
              ].flat(),
              children: [
                {
                  type: "instance",
                  component: "Box",
                  label: "Sheet Header",
                  styles: [tc.flex(), tc.flex("col"), tc.gap(1)].flat(),
                  children: [
                    {
                      type: "instance",
                      component: "SheetTitle",
                      /**
                       * text-lg leading-none tracking-tight
                       **/
                      styles: [
                        tc.my(0),
                        tc.leading("none"),
                        tc.text("lg"),
                        tc.tracking("tight"),
                      ].flat(),
                      children: [
                        {
                          type: "text",
                          value: "Sheet Title",
                        },
                      ],
                    },
                    {
                      type: "instance",
                      component: "SheetDescription",
                      /**
                       * text-sm text-muted-foreground
                       **/
                      styles: [
                        tc.my(0),
                        tc.text("sm"),
                        tc.text("mutedForeground"),
                      ].flat(),
                      children: [
                        {
                          type: "text",
                          value: "sheet description text you can edit",
                        },
                      ],
                    },
                  ],
                },

                {
                  type: "instance",
                  component: "Text",
                  children: [{ type: "text", value: "The text you can edit" }],
                },

                {
                  type: "instance",
                  component: "SheetClose",
                  /**
                   * absolute right-4 top-4
                   * rounded-sm opacity-70
                   * ring-offset-background
                   * hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                   * flex items-center justify-center h-4 w-4
                   **/
                  styles: [
                    tc.absolute(),
                    tc.right(4),
                    tc.top(4),
                    tc.rounded("sm"),
                    tc.opacity(70),
                    tc.flex(),
                    tc.items("center"),
                    tc.justify("center"),
                    tc.h(4),
                    tc.w(4),
                    tc.border(0),
                    tc.bg("transparent"),
                    tc.outline("none"),
                    tc.hover(tc.opacity(100)),
                    tc.focus(tc.ring("ring", 2, "background", 2)),
                  ].flat(),
                  children: [{ type: "text", value: "✕" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const propsMetaSheet: WsComponentPropsMeta = {
  props: propsSheet,
  initialProps: ["open"],
};

export const propsMetaSheetTrigger: WsComponentPropsMeta = {
  props: propsSheetTrigger,
};

export const propsMetaSheetContent: WsComponentPropsMeta = {
  props: propsSheetContent,
  initialProps: ["side", "role", "tag"],
};

export const propsMetaSheetOverlay: WsComponentPropsMeta = {
  props: propsSheetOverlay,
  initialProps: [],
};

export const propsMetaSheetClose: WsComponentPropsMeta = {
  props: propsSheetClose,
  initialProps: [],
};

export const propsMetaSheetTitle: WsComponentPropsMeta = {
  props: propsSheetTitle,
  initialProps: [],
};

export const propsMetaSheetDescription: WsComponentPropsMeta = {
  props: propsSheetDescription,
  initialProps: [],
};
