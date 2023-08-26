import { HamburgerMenuIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";
import * as tc from "./theme/tailwind-classes";
import { getButtonStyles } from "./theme/styles";

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/sheet.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/
export const meta: WsComponentMeta = {
  category: "radix",
  order: 1,
  type: "container",
  icon: HamburgerMenuIcon,
  stylable: false,
  template: [
    {
      type: "instance",
      component: "Dialog",
      label: "Sheet",
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
          component: "DialogTrigger",
          label: "Sheet Trigger",
          children: [
            {
              type: "instance",
              component: "Button",
              styles: getButtonStyles("ghost", "icon"),
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
            },
          ],
        },
        {
          type: "instance",
          component: "DialogOverlay",
          label: "Sheet Overlay",
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
              component: "DialogContent",
              label: "Sheet Content",
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
                // side=left
                tc.mr("auto"),
                tc.maxW("sm"),
                tc.grow(),
              ].flat(),
              children: [
                {
                  type: "instance",
                  component: "Box",
                  label: "Navigation",
                  props: [
                    { name: "tag", type: "string", value: "nav" },
                    { name: "role", type: "string", value: "navigation" },
                  ],
                  children: [
                    {
                      type: "instance",
                      component: "Box",
                      label: "Sheet Header",
                      styles: [tc.flex(), tc.flex("col"), tc.gap(1)].flat(),
                      children: [
                        {
                          type: "instance",
                          component: "DialogTitle",
                          label: "Sheet Title",
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
                          component: "DialogDescription",
                          label: "Sheet Description",
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
                              value: "Sheet description text you can edit",
                            },
                          ],
                        },
                      ],
                    },

                    {
                      type: "instance",
                      component: "Text",
                      children: [
                        { type: "text", value: "The text you can edit" },
                      ],
                    },
                  ],
                },
                {
                  type: "instance",
                  component: "DialogClose",
                  label: "Close Button",
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
