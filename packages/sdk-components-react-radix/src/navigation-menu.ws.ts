import {
  ContentIcon,
  ListIcon,
  ListItemIcon,
  TriggerIcon,
  BoxIcon,
  ViewportIcon,
  NavigationMenuIcon,
} from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { getRadixComponentId } from "./shared/component-id";
import {
  propsNavigationMenu,
  propsNavigationMenuItem,
  propsNavigationMenuTrigger,
  propsNavigationMenuContent,
  propsNavigationMenuLink,
  propsNavigationMenuList,
  propsNavigationMenuViewport,
} from "./__generated__/navigation-menu.props";

export const metaNavigationMenu: WsComponentMeta = {
  icon: NavigationMenuIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [
      getRadixComponentId("NavigationMenuList"),
      getRadixComponentId("NavigationMenuViewport"),
    ],
  },
  presetStyle: {
    div,
  },
  props: propsNavigationMenu,
};

export const metaNavigationMenuList: WsComponentMeta = {
  icon: ListIcon,
  label: "Menu List",
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [getRadixComponentId("NavigationMenuItem")],
  },
  presetStyle: {
    div,
  },
  props: propsNavigationMenuList,
};

export const metaNavigationMenuItem: WsComponentMeta = {
  icon: ListItemIcon,
  label: "Menu Item",
  indexWithinAncestor: getRadixComponentId("NavigationMenu"),
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [
      getRadixComponentId("NavigationMenuTrigger"),
      getRadixComponentId("NavigationMenuContent"),
      getRadixComponentId("NavigationMenuLink"),
    ],
  },
  presetStyle: {
    div,
  },
  props: propsNavigationMenuItem,
};

export const metaNavigationMenuTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  label: "Menu Trigger",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  states: [
    { label: "Open", selector: '[data-state="open"]' },
    { label: "Closed", selector: '[data-state="closed"]' },
  ],
  props: propsNavigationMenuTrigger,
};

export const metaNavigationMenuContent: WsComponentMeta = {
  icon: ContentIcon,
  label: "Menu Content",
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [getRadixComponentId("NavigationMenuLink")],
  },
  states: [
    { label: "Open", selector: '[data-state="open"]' },
    { label: "Closed", selector: '[data-state="closed"]' },
  ],
  presetStyle: {
    div,
  },
  props: propsNavigationMenuContent,
};

export const metaNavigationMenuLink: WsComponentMeta = {
  icon: BoxIcon,
  label: "Accessible Link Wrapper",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  props: propsNavigationMenuLink,
};

export const metaNavigationMenuViewport: WsComponentMeta = {
  icon: ViewportIcon,
  label: "Menu Viewport",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  states: [
    { label: "Open", selector: '[data-state="open"]' },
    { label: "Closed", selector: '[data-state="closed"]' },
  ],
  presetStyle: {
    div,
  },
  props: propsNavigationMenuViewport,
};
