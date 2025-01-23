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
  type: "container",
  icon: NavigationMenuIcon,
  presetStyle: {
    div,
  },
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
};

export const metaNavigationMenuList: WsComponentMeta = {
  type: "container",
  icon: ListIcon,
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: "NavigationMenu" },
    },
    {
      relation: "descendant",
      component: { $eq: "NavigationMenuItem" },
    },
  ],
  presetStyle: {
    div,
  },
  label: "Menu List",
};

export const metaNavigationMenuItem: WsComponentMeta = {
  type: "container",
  icon: ListItemIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "NavigationMenuList" },
  },
  presetStyle: {
    div,
  },
  indexWithinAncestor: "NavigationMenu",
  label: "Menu Item",
};

export const metaNavigationMenuTrigger: WsComponentMeta = {
  type: "container",
  icon: TriggerIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "NavigationMenuItem" },
  },
  label: "Menu Trigger",
};

export const metaNavigationMenuContent: WsComponentMeta = {
  type: "container",
  icon: ContentIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "NavigationMenuItem" },
  },
  indexWithinAncestor: "NavigationMenu",
  presetStyle: {
    div,
  },
  label: "Menu Content",
};

export const metaNavigationMenuLink: WsComponentMeta = {
  type: "container",
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
  label: "Accessible Link Wrapper",
};

export const metaNavigationMenuViewport: WsComponentMeta = {
  type: "container",
  icon: ViewportIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "NavigationMenu" },
  },
  presetStyle: {
    div,
  },
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
