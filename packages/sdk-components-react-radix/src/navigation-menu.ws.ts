import {
  ContentIcon,
  ListIcon,
  ListItemIcon,
  TriggerIcon,
  BoxIcon,
  ViewportIcon,
  NavigationMenuIcon,
} from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
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
};

export const metaNavigationMenuTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  label: "Menu Trigger",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
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
};

export const metaNavigationMenuLink: WsComponentMeta = {
  icon: BoxIcon,
  label: "Accessible Link Wrapper",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
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
