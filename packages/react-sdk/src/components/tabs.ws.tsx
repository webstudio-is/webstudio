import { BoxIcon } from "@webstudio-is/icons/svg";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/tabs.props";
import { div } from "../css/normalize";
import type { defaultTag } from "./tabs";

const presetStyle = {
  div: [
    ...div,
    {
      property: "display",
      value: { type: "keyword", value: "flex" },
    },
    {
      property: "flexDirection",
      value: { type: "keyword", value: "column" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "Radix UI",
  type: "container",
  label: "Tabs",
  icon: BoxIcon,
  presetStyle,
  states: [
    { selector: "[data-orientation=vertical]", label: "Vertical orientation" },
    {
      selector: "[data-orientation=horizontal]",
      label: "Horizontal orientation",
    },
  ],
  children: [
    {
      type: "instance",
      component: "TabsList",
      children: [
        {
          type: "instance",
          component: "TabsTrigger",
          props: [
            { type: "string", name: "value", value: "tab1" },
            { type: "string", name: "innerText", value: "One" },
          ],
          children: [],
        },
        {
          type: "instance",
          component: "TabsTrigger",
          props: [
            { type: "string", name: "value", value: "tab2" },
            { type: "string", name: "innerText", value: "Two" },
          ],
          children: [],
        },
        {
          type: "instance",
          component: "TabsTrigger",
          props: [
            { type: "string", name: "value", value: "tab3" },
            { type: "string", name: "innerText", value: "Three" },
          ],
          children: [],
        },
      ],
    },
    {
      type: "instance",
      component: "TabsContent",
      props: [{ type: "string", name: "value", value: "tab1" }],
      children: [
        {
          type: "instance",
          component: "Paragraph",
          children: [{ type: "text", value: "One" }],
        },
      ],
    },
    {
      type: "instance",
      component: "TabsContent",
      props: [{ type: "string", name: "value", value: "tab2" }],
      children: [
        {
          type: "instance",
          component: "Paragraph",
          children: [{ type: "text", value: "Two" }],
        },
      ],
    },
    {
      type: "instance",
      component: "TabsContent",
      props: [{ type: "string", name: "value", value: "tab3" }],
      children: [
        {
          type: "instance",
          component: "Paragraph",
          children: [{ type: "text", value: "Three" }],
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["defaultValue", "value", "orientation", "activationMode"],
};
