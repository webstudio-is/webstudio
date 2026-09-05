import {
  ContentIcon,
  HeaderIcon,
  TabsIcon,
  TriggerIcon,
} from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { button, div } from "@webstudio-is/sdk/normalize.css";
import { getRadixComponentId } from "./shared/component-id";
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
    descendants: [
      getRadixComponentId("TabsList"),
      getRadixComponentId("TabsContent"),
    ],
  },
  presetStyle: { div },
  props: propsTabs,
};

export const metaTabsList: WsComponentMeta = {
  icon: HeaderIcon,
  contentModel: {
    category: "none",
    children: ["instance"],
    descendants: [getRadixComponentId("TabsTrigger")],
  },
  presetStyle: { div },
  props: propsTabsList,
};

export const metaTabsTrigger: WsComponentMeta = {
  icon: TriggerIcon,
  label: "Tab Trigger",
  indexWithinAncestor: getRadixComponentId("Tabs"),
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  states: [
    { label: "Active", selector: '[data-state="active"]' },
    { label: "Inactive", selector: '[data-state="inactive"]' },
  ],
  presetStyle: {
    button: [button, buttonReset].flat(),
  },
  props: propsTabsTrigger,
};

export const metaTabsContent: WsComponentMeta = {
  label: "Tab Content",
  icon: ContentIcon,
  indexWithinAncestor: getRadixComponentId("Tabs"),
  contentModel: {
    category: "none",
    children: ["instance", "rich-text"],
  },
  states: [
    { label: "Active", selector: '[data-state="active"]' },
    { label: "Inactive", selector: '[data-state="inactive"]' },
  ],
  presetStyle: { div },
  props: propsTabsContent,
};
