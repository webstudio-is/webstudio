import {
  ContentIcon,
  HeaderIcon,
  TabsIcon,
  TriggerIcon,
} from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { button, div } from "@webstudio-is/sdk/normalize.css";
import { radix } from "./shared/meta";
import { buttonReset } from "./shared/preset-styles";
import {
  propsTabs,
  propsTabsList,
  propsTabsTrigger,
  propsTabsContent,
} from "./__generated__/tabs.props";

export const metaTabs: WsComponentMeta = {
  icon: TabsIcon,
  contentModel: {
    category: "instance",
    children: ["instance"],
    descendants: [radix.TabsList, radix.TabsContent],
  },
  presetStyle: {
    div,
  },
};

export const metaTabsList: WsComponentMeta = {
  icon: HeaderIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.TabsTrigger],
  },
  presetStyle: {
    div,
  },
};

export const metaTabsTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  label: "Tab Trigger",
  indexWithinAncestor: radix.Tabs,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  states: [
    ...defaultStates,
    {
      category: "component-states",
      label: "Active",
      selector: "[data-state=active]",
    },
  ],
  presetStyle: {
    button: [button, buttonReset].flat(),
  },
};

export const metaTabsContent: WsComponentMeta = {
  label: "Tab Content",
  icon: ContentIcon,
  indexWithinAncestor: radix.Tabs,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: {
    div,
  },
};

export const propsMetaTabs: WsComponentPropsMeta = {
  props: propsTabs,
};

export const propsMetaTabsList: WsComponentPropsMeta = {
  props: propsTabsList,
};

export const propsMetaTabsTrigger: WsComponentPropsMeta = {
  props: propsTabsTrigger,
};

export const propsMetaTabsContent: WsComponentPropsMeta = {
  props: propsTabsContent,
};
