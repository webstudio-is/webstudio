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
  // EmbedTemplateStyleDecl,
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";

import { div } from "@webstudio-is/react-sdk/css-normalize";

// import * as tc from "./theme/tailwind-classes";

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

export const metaNavigationMenu: WsComponentMeta = {
  category: "radix",
  order: 2,
  type: "container",
  icon: HamburgerMenuIcon,
  presetStyle,
  template: [
    {
      type: "instance",
      component: "NavigationMenu",
      dataSources: {
        menuValue: { type: "variable", initialValue: "0" },
      },
      props: [
        { type: "dataSource", name: "value", dataSourceName: "menuValue" },
        {
          name: "onValueChange",
          type: "action",
          value: [
            { type: "execute", args: ["value"], code: `menuValue = value` },
          ],
        },
      ],
      children: [],
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
};

export const metaNavigationMenuItem: WsComponentMeta = {
  category: "hidden",
  detachable: false,
  type: "container",
  icon: ItemIcon,
  requiredAncestors: ["NavigationMenu"],
  presetStyle,
};
export const metaNavigationMenuTrigger: WsComponentMeta = {
  category: "hidden",
  detachable: false,
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
