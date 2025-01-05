import {
  ContentIcon,
  HeaderIcon,
  TabsIcon,
  TriggerIcon,
} from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { button, div } from "@webstudio-is/sdk/normalize.css";
import { buttonReset } from "./shared/preset-styles";
import {
  propsTabs,
  propsTabsList,
  propsTabsTrigger,
  propsTabsContent,
} from "./__generated__/tabs.props";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

export const metaTabs: WsComponentMeta = {
  type: "container",
  icon: TabsIcon,
  constraints: [
    {
      relation: "descendant",
      component: { $eq: "TabsTrigger" },
    },
    {
      relation: "descendant",
      component: { $eq: "TabsList" },
    },
    {
      relation: "descendant",
      component: { $eq: "TabsContent" },
    },
  ],
  presetStyle,
};

export const metaTabsList: WsComponentMeta = {
  type: "container",
  icon: HeaderIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "Tabs" },
  },
  presetStyle,
};

export const metaTabsTrigger: WsComponentMeta = {
  type: "container",
  icon: TriggerIcon,
  constraints: [
    {
      relation: "ancestor",
      component: { $eq: "TabsList" },
    },
    {
      relation: "ancestor",
      component: { $neq: "TabsTrigger" },
    },
  ],
  indexWithinAncestor: "Tabs",
  label: "Tab Trigger",
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
  type: "container",
  label: "Tab Content",
  icon: ContentIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "Tabs" },
  },
  indexWithinAncestor: "Tabs",
  presetStyle,
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
