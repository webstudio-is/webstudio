import {
  ContentIcon,
  HeaderIcon,
  TabsIcon,
  TriggerIcon,
} from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
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
  presetStyle: { div },
  props: propsTabs,
};

export const metaTabsList: WsComponentMeta = {
  icon: HeaderIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [radix.TabsTrigger],
  },
  presetStyle: { div },
  props: propsTabsList,
};

export const metaTabsTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  label: "Tab Trigger",
  indexWithinAncestor: radix.Tabs,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  states: [{ label: "Active", selector: "[data-state=active]" }],
  presetStyle: {
    button: [button, buttonReset].flat(),
  },
  props: propsTabsTrigger,
};

export const metaTabsContent: WsComponentMeta = {
  label: "Tab Content",
  icon: ContentIcon,
  indexWithinAncestor: radix.Tabs,
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  presetStyle: { div },
  props: propsTabsContent,
};
