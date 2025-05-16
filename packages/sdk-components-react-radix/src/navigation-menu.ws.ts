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
import { radix } from "./shared/meta";
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
    descendants: [radix.NavigationMenuList, radix.NavigationMenuViewport],
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
    descendants: [radix.NavigationMenuItem],
  },
  presetStyle: {
    div,
  },
  props: propsNavigationMenuList,
};

export const metaNavigationMenuItem: WsComponentMeta = {
  icon: ListItemIcon,
  label: "Menu Item",
  indexWithinAncestor: radix.NavigationMenu,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [
      radix.NavigationMenuTrigger,
      radix.NavigationMenuContent,
      radix.NavigationMenuLink,
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
  props: propsNavigationMenuTrigger,
};

export const metaNavigationMenuContent: WsComponentMeta = {
  icon: ContentIcon,
  label: "Menu Content",
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.NavigationMenuLink],
  },
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
  presetStyle: {
    div,
  },
  props: propsNavigationMenuViewport,
};
