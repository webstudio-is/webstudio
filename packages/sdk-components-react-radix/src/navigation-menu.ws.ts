import {
  ContentIcon,
  HeaderIcon,
  HamburgerMenuIcon,
  ItemIcon,
  TriggerIcon,
  LinkIcon,
  ExternalLinkIcon,
} from "@webstudio-is/icons/svg";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";

import { template as buttonTemplate } from "./button.ws";

import { div } from "@webstudio-is/react-sdk/css-normalize";

import * as tc from "./theme/tailwind-classes";

import {
  propsNavigationMenu,
  propsNavigationMenuItem,
  propsNavigationMenuTrigger,
  propsNavigationMenuContent,
  propsNavigationMenuLink,
  propsNavigationMenuList,
  propsNavigationMenuViewport,
} from "./__generated__/navigation-menu.props";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

const menuItem = (props: {
  title: string;
  linkPrefix: string;
  linkCount: number;
}): NonNullable<WsComponentMeta["template"]> => [
  {
    type: "instance",
    component: "NavigationMenuItem",
    children: [
      {
        type: "instance",
        component: "NavigationMenuTrigger",
        children: buttonTemplate({
          children: [{ type: "text", value: props.title }],
        }),
      },
      {
        type: "instance",
        component: "NavigationMenuContent",
        tokens: ["navigationMenuContent"],
        children: [
          {
            type: "instance",
            component: "Box",
            label: "Content Container",
            styles: [tc.flex(), tc.gap(4)].flat(),

            children: [
              {
                type: "instance",
                component: "Box",
                styles: [tc.bg("border"), tc.p(4)].flat(),
                children: [
                  {
                    type: "text",
                    value: "Content",
                  },
                ],
              },

              {
                type: "instance",
                component: "Box",
                label: "Content Container",
                styles: [tc.flex(), tc.gap(4), tc.flex("col")].flat(),
                children: Array.from(Array(props.linkCount), (_, index) => ({
                  type: "instance",
                  component: "NavigationMenuLink",
                  children: [
                    {
                      type: "instance",
                      component: "Link",
                      children: [
                        {
                          type: "text",
                          value: `${props.linkPrefix} + ${index}`,
                        },
                      ],
                    },
                  ],
                })),
              },
            ],
          },
        ],
      },
    ],
  },
];

export const metaNavigationMenu: WsComponentMeta = {
  category: "radix",
  order: 2,
  type: "container",
  icon: HamburgerMenuIcon,
  presetStyle,
  presetTokens: {
    navigationMenu: {
      // relative
      // Omiting this: z-10 flex max-w-max flex-1 items-center justify-center
      styles: [tc.relative()].flat(),
    },
  },
  template: [
    {
      type: "instance",
      component: "NavigationMenu",

      dataSources: {
        menuValue: { type: "variable", initialValue: "" },
      },
      props: [
        { type: "dataSource", name: "value", dataSourceName: "menuValue" },
        {
          name: "onValueChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: `menuValue = value`,
            },
          ],
        },
      ],

      tokens: ["navigationMenu"],

      children: [
        {
          type: "instance",
          component: "NavigationMenuList",
          tokens: ["navigationMenuList"],
          children: [
            ...menuItem({
              title: "Item One",
              linkCount: 5,
              linkPrefix: "Link to page",
            }),
            ...menuItem({
              title: "Item Two",
              linkCount: 3,
              linkPrefix: "Link to other page",
            }),
          ],
        },

        {
          type: "instance",
          component: "Box",
          label: "Viewport Container",
          // absolute left-0 top-full flex justify-center
          styles: [
            tc.absolute(),
            tc.left(0),
            tc.top("full"),
            tc.flex(),
            tc.justify("center"),
          ].flat(),

          children: [
            {
              type: "instance",
              component: "NavigationMenuViewport",
              tokens: ["navigationMenuViewport"],
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

export const metaNavigationMenuList: WsComponentMeta = {
  category: "hidden",
  detachable: false,
  type: "container",
  icon: HeaderIcon,
  requiredAncestors: ["NavigationMenu"],
  presetStyle,
  presetTokens: {
    navigationMenuList: {
      styles: [
        // ul defaults in tailwind
        tc.p(0),
        tc.m(0),
        // shadcdn styles
        tc.flex(),
        tc.flex(1),
        tc.list("none"),
        tc.items("center"),
        tc.justify("center"),
        tc.gap(1),
      ].flat(),
    },
  },
};

export const metaNavigationMenuItem: WsComponentMeta = {
  category: "hidden",
  detachable: false,
  type: "container",
  icon: ItemIcon,
  requiredAncestors: ["NavigationMenu"],
  presetStyle,
  indexWithinAncestor: "NavigationMenu",
  // no default tokens
};
export const metaNavigationMenuTrigger: WsComponentMeta = {
  category: "hidden",
  detachable: false,
  stylable: false,
  type: "container",
  icon: TriggerIcon,
  requiredAncestors: ["NavigationMenuItem"],
  presetStyle,
};
export const metaNavigationMenuContent: WsComponentMeta = {
  category: "hidden",
  detachable: false,
  type: "container",
  icon: ContentIcon,
  requiredAncestors: ["NavigationMenuItem"],
  indexWithinAncestor: "NavigationMenu",

  presetTokens: {
    navigationMenuContent: {
      // left-0 top-0 absolute w-max
      styles: [
        tc.left(0),
        tc.top(0),
        tc.absolute(),
        tc.w("max"),
        tc.p(4),
      ].flat(),
    },
  },

  presetStyle,
};

export const metaNavigationMenuLink: WsComponentMeta = {
  category: "hidden",
  detachable: true,
  type: "container",
  stylable: false,
  icon: LinkIcon,
  requiredAncestors: ["NavigationMenuContent"],
  presetStyle,
};

export const metaNavigationMenuViewport: WsComponentMeta = {
  category: "hidden",
  detachable: false,
  type: "container",
  icon: ExternalLinkIcon,
  requiredAncestors: ["NavigationMenu"],
  presetStyle,
  presetTokens: {
    navigationMenuViewport: {
      /*
        origin-top-center relative mt-1.5 w-full
        overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg
        h-[var(--radix-navigation-menu-viewport-height)]
        w-[var(--radix-navigation-menu-viewport-width)]
        // anims
        [animation-duration:150ms!important] [transition-duration:150ms!important]
        data-[state=open]:animate-in data-[state=closed]:animate-out
        data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90
      */
      styles: [
        tc.relative(),
        tc.mt(1.5),
        tc.overflow("hidden"),
        tc.rounded("md"),
        tc.border(),
        tc.bg("popover"),
        tc.text("popoverForeground"),
        tc.shadow("lg"),
        tc.property("height", "--radix-navigation-menu-viewport-height"),
        tc.property("width", "--radix-navigation-menu-viewport-width"),
      ].flat(),
    },
  },
};

export const propsMetaNavigationMenu: WsComponentPropsMeta = {
  props: propsNavigationMenu,
};
export const propsMetaNavigationMenuItem: WsComponentPropsMeta = {
  props: propsNavigationMenuItem,
};
export const propsMetaNavigationMenuTrigger: WsComponentPropsMeta = {
  props: propsNavigationMenuTrigger,
};
export const propsMetaNavigationMenuContent: WsComponentPropsMeta = {
  props: propsNavigationMenuContent,
};
export const propsMetaNavigationMenuLink: WsComponentPropsMeta = {
  props: propsNavigationMenuLink,
};
export const propsMetaNavigationMenuList: WsComponentPropsMeta = {
  props: propsNavigationMenuList,
};
export const propsMetaNavigationMenuViewport: WsComponentPropsMeta = {
  props: propsNavigationMenuViewport,
};
