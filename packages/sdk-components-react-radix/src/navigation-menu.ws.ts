import {
  ContentIcon,
  ListIcon,
  ListItemIcon,
  TriggerIcon,
  BoxIcon,
  ChevronDownIcon,
  ViewportIcon,
  NavigationMenuIcon,
} from "@webstudio-is/icons/svg";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import * as tc from "./theme/tailwind-classes";
import { getButtonStyles } from "./theme/styles";
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

const components = [
  {
    title: "Sheet",
    href: "/docs/components/sheet",
    description:
      "Extends the Dialog component to display content that complements the main content of the screen.",
  },
  {
    title: "Navigation Menu",
    href: "/docs/components/navigation-menu",
    description: "A collection of links for navigating websites.",
  },
  {
    title: "Tabs",
    href: "/docs/components/tabs",
    description:
      "A set of layered sections of content—known as tab panels—that are displayed one at a time.",
  },
  {
    title: "Accordion",
    href: "/docs/components/accordion",
    description:
      "A vertically stacked set of interactive headings that each reveal a section of content.",
  },
  {
    title: "Dialog",
    href: "/docs/components/dialog",
    description:
      "A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.",
  },
  {
    title: "Collapsible",
    href: "/docs/components/collapsible",
    description: "An interactive component which expands/collapses a panel.",
  },

  {
    title: "Popover",
    href: "/docs/components/popover",
    description: "Displays rich content in a portal, triggered by a button.",
  },

  {
    title: "Tooltip",
    href: "/docs/components/tooltip",
    description:
      "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
  },

  {
    title: "Button",
    href: "/docs/components/button",
    description: "Displays a button or a component that looks like a button.",
  },
];

const navItem = (
  props: (typeof components)[number]
): NonNullable<WsComponentMeta["template"]> => [
  {
    type: "instance",
    component: "NavigationMenuLink",
    children: [
      {
        type: "instance",
        component: "Link",
        // block select-none space-y-1 rounded-md p-3 leading-none
        // no-underline outline-none transition-colors
        // hover:bg-accent hover:text-accent-foreground
        // focus:bg-accent focus:text-accent-foreground
        styles: [
          tc.text("inherit"),
          tc.flex(),
          tc.flex("col"),
          tc.select("none"),
          tc.gap(1),
          tc.rounded("md"),
          tc.p(3),
          tc.leading("none"),
          tc.noUnderline(),
          tc.outline("none"),
          tc.hover([tc.bg("accent"), tc.text("accentForeground")].flat()),
          tc.focus([tc.bg("accent"), tc.text("accentForeground")].flat()),
        ].flat(),
        props: [
          {
            name: "href",
            type: "string",
            value: `https://ui.shadcn.com${props.href}`,
          },
        ],
        children: [
          {
            type: "instance",
            component: "Text",
            // text-sm font-medium leading-none
            styles: [
              tc.text("sm"),
              tc.font("medium"),
              tc.leading("none"),
            ].flat(),
            children: [
              {
                type: "text",
                value: props.title,
                placeholder: true,
              },
            ],
          },
          {
            type: "instance",
            component: "Paragraph",
            // line-clamp-2 text-sm leading-snug text-muted-foreground
            styles: [
              tc.m(0),
              tc.lineClamp(2),
              tc.text("sm"),
              tc.leading("snug"),
              tc.text("mutedForeground"),
            ].flat(),

            children: [
              {
                type: "text",
                value: props.description,
                placeholder: true,
              },
            ],
          },
        ],
      },
    ],
  },
];

const navItemsList = (props: {
  count: number;
  offset: number;
}): NonNullable<WsComponentMeta["template"]> => [
  {
    type: "instance",
    component: "Box",
    label: "Flex Column",
    styles: [tc.w(64), tc.flex(), tc.gap(4), tc.flex("col")].flat(),
    children: Array.from(Array(props.count), (_, index) =>
      navItem(components[index + props.offset])
    ).flat(),
  },
];

const menuItemLink = (props: {
  title: string;
}): NonNullable<WsComponentMeta["template"]> => [
  {
    type: "instance",
    component: "NavigationMenuItem",
    children: [
      {
        type: "instance",
        component: "NavigationMenuLink",
        children: [
          {
            type: "instance",
            component: "Link",
            styles: [
              getButtonStyles("ghost", "sm"),
              tc.noUnderline(),
              tc.text("current"),
            ].flat(),
            children: [{ type: "text", value: props.title, placeholder: true }],
          },
        ],
      },
    ],
  },
];

const menuItem = (props: {
  title: string;
  children: NonNullable<WsComponentMeta["template"]>;
  padding: 0 | 2;
}): NonNullable<WsComponentMeta["template"]> => [
  {
    type: "instance",
    component: "NavigationMenuItem",
    children: [
      {
        type: "instance",
        component: "NavigationMenuTrigger",
        children: [
          {
            type: "instance",
            component: "Button",
            styles: [
              getButtonStyles("ghost", "sm"),
              tc.property("--navigation-menu-trigger-icon-transform", "0deg"),
              tc.state(
                [
                  tc.property(
                    "--navigation-menu-trigger-icon-transform",
                    "180deg"
                  ),
                ],
                "[data-state=open]"
              ),
            ].flat(),
            children: [
              {
                type: "instance",
                component: "Text",
                children: [
                  { type: "text", value: props.title, placeholder: true },
                ],
              },
              {
                type: "instance",
                component: "Box",
                label: "Icon Container",
                // h-4 w-4 shrink-0 transition-transform duration-200
                styles: [
                  tc.ml(1),
                  tc.property(
                    "rotate",
                    "--navigation-menu-trigger-icon-transform"
                  ),
                  tc.h(4),
                  tc.w(4),
                  tc.shrink(0),
                  tc.transition("all"),
                  tc.duration(200),
                ].flat(),
                children: [
                  {
                    type: "instance",
                    component: "HtmlEmbed",
                    label: "Chevron Icon",
                    props: [
                      {
                        type: "string",
                        name: "code",
                        value: ChevronDownIcon,
                      },
                    ],
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "instance",
        component: "NavigationMenuContent",
        // left-0 top-0 absolute w-max
        styles: [
          tc.left(0),
          tc.top(0),
          tc.absolute(),
          tc.w("max"),
          tc.p(4),
        ].flat(),
        children: [
          {
            type: "instance",
            component: "Box",
            label: "Content",
            styles: [tc.flex(), tc.gap(4), tc.p(props.padding)].flat(),
            children: props.children,
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
  description: "A collection of links for navigating websites.",
  icon: NavigationMenuIcon,
  presetStyle,
  constraints: [
    {
      relation: "descendant",
      component: { $eq: "NavigationMenuList" },
    },
    {
      relation: "descendant",
      component: { $eq: "NavigationMenuViewport" },
    },
  ],
  template: [
    {
      type: "instance",
      component: "NavigationMenu",
      props: [],
      // relative
      // Omiting this: z-10 flex max-w-max flex-1 items-center justify-center
      styles: [tc.relative(), tc.maxW("max")].flat(),
      children: [
        {
          type: "instance",
          component: "NavigationMenuList",
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
          children: [
            ...menuItem({
              title: "About",
              padding: 2,
              children: [
                {
                  type: "instance",
                  component: "Box",
                  styles: [
                    tc.bg("border"),
                    tc.p(4),
                    tc.w(48),
                    tc.rounded("md"),
                  ].flat(),
                  children: [
                    {
                      type: "text",
                      value: "",
                      placeholder: true,
                    },
                  ],
                },
                ...navItemsList({ count: 3, offset: 0 }),
              ],
            }),
            ...menuItem({
              title: "Components",
              padding: 0,
              children: [
                ...navItemsList({ count: 3, offset: 3 }),
                ...navItemsList({ count: 3, offset: 6 }),
              ],
            }),
            ...menuItemLink({ title: "Standalone" }),
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
                tc.property(
                  "height",
                  "--radix-navigation-menu-viewport-height"
                ),
                tc.property("width", "--radix-navigation-menu-viewport-width"),
              ].flat(),
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
  type: "container",
  icon: ListIcon,
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: "NavigationMenu" },
    },
    {
      relation: "child",
      component: { $eq: "NavigationMenuItem" },
    },
  ],
  presetStyle,
  label: "Menu List",
};

export const metaNavigationMenuItem: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: ListItemIcon,
  constraints: {
    relation: "parent",
    component: { $eq: "NavigationMenuList" },
  },
  presetStyle,
  indexWithinAncestor: "NavigationMenu",
  label: "Menu Item",
};

export const metaNavigationMenuTrigger: WsComponentMeta = {
  category: "hidden",
  stylable: false,
  type: "container",
  icon: TriggerIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "NavigationMenuItem" },
  },
  presetStyle,
  label: "Menu Trigger",
};

export const metaNavigationMenuContent: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: ContentIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "NavigationMenuItem" },
  },
  indexWithinAncestor: "NavigationMenu",
  presetStyle,
  label: "Menu Content",
};

export const metaNavigationMenuLink: WsComponentMeta = {
  category: "hidden",
  type: "container",
  stylable: false,
  icon: BoxIcon,
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: "NavigationMenu" },
    },
    {
      relation: "ancestor",
      component: { $in: ["NavigationMenuContent", "NavigationMenuItem"] },
    },
  ],
  presetStyle,
  label: "Accessible Link Wrapper",
};

export const metaNavigationMenuViewport: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: ViewportIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "NavigationMenu" },
  },
  presetStyle,
  label: "Menu Viewport",
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
