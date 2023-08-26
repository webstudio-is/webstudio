import {
  ContentIcon,
  HeaderIcon,
  TabsIcon,
  TriggerIcon,
} from "@webstudio-is/icons/svg";
import type {
  EmbedTemplateStyleDecl,
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { button, div } from "@webstudio-is/react-sdk/css-normalize";
import * as tc from "./theme/tailwind-classes";
import { buttonReset } from "./theme/styles";
import {
  propsTabs,
  propsTabsList,
  propsTabsTrigger,
  propsTabsContent,
} from "./__generated__/tabs.props";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/tabs.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/

// inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all
// focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
// disabled:pointer-events-none disabled:opacity-50
// data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm
const tabsTriggerStyles = [
  tc.inlineFlex(),
  tc.items("center"),
  tc.justify("center"),
  tc.whitespace("nowrap"),
  tc.rounded("md"),
  tc.px(3),
  tc.py(1.5),
  tc.text("sm"),
  tc.font("medium"),
  tc.transition("all"),
  tc.focusVisible(
    [tc.outline("none"), tc.ring("ring", 2, "background", 2)].flat()
  ),
  tc.disabled([tc.pointerEvents("none"), tc.opacity(50)].flat()),
  tc.state(
    [tc.bg("background"), tc.text("foreground"), tc.shadow("sm")].flat(),
    "[data-state=active]"
  ),
].flat();

// mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
const tabsContentStyles: EmbedTemplateStyleDecl[] = [
  tc.mt(2),
  tc.focusVisible(
    [tc.outline("none"), tc.ring("ring", 2, "background", 2)].flat()
  ),
].flat();

export const metaTabs: WsComponentMeta = {
  category: "radix",
  order: 2,
  type: "container",
  icon: TabsIcon,
  presetStyle,
  template: [
    {
      type: "instance",
      component: "Tabs",
      dataSources: {
        tabsValue: { type: "variable", initialValue: "0" },
      },
      props: [
        { type: "dataSource", name: "value", dataSourceName: "tabsValue" },
        {
          name: "onValueChange",
          type: "action",
          value: [
            { type: "execute", args: ["value"], code: `tabsValue = value` },
          ],
        },
      ],
      children: [
        {
          type: "instance",
          component: "TabsList",
          // inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground
          styles: [
            tc.inlineFlex(),
            tc.h(10),
            tc.items("center"),
            tc.justify("center"),
            tc.rounded("md"),
            tc.bg("muted"),
            tc.p(1),
            tc.text("mutedForeground"),
          ].flat(),
          children: [
            {
              type: "instance",
              component: "TabsTrigger",
              styles: tabsTriggerStyles,
              children: [{ type: "text", value: "Account" }],
            },
            {
              type: "instance",
              component: "TabsTrigger",
              styles: tabsTriggerStyles,
              children: [{ type: "text", value: "Password" }],
            },
          ],
        },
        {
          type: "instance",
          component: "TabsContent",
          styles: tabsContentStyles,
          children: [
            { type: "text", value: "Make changes to your account here." },
          ],
        },
        {
          type: "instance",
          component: "TabsContent",
          styles: tabsContentStyles,
          children: [{ type: "text", value: "Change your password here." }],
        },
      ],
    },
  ],
};

export const metaTabsList: WsComponentMeta = {
  category: "hidden",
  detachable: false,
  type: "container",
  icon: HeaderIcon,
  requiredAncestors: ["Tabs"],
  presetStyle,
};

export const metaTabsTrigger: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: TriggerIcon,
  requiredAncestors: ["TabsList"],
  invalidAncestors: ["TabsTrigger"],
  indexWithinAncestor: "Tabs",
  label: "Tab Trigger",
  presetStyle: {
    button: [button, buttonReset].flat(),
  },
};

export const metaTabsContent: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: ContentIcon,
  requiredAncestors: ["Tabs"],
  indexWithinAncestor: "Tabs",
  presetStyle,
  label: "Tab Content",
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
