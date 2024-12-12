import {
  CollapsibleIcon,
  TriggerIcon,
  ContentIcon,
} from "@webstudio-is/icons/svg";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import {
  propsCollapsible,
  propsCollapsibleContent,
  propsCollapsibleTrigger,
} from "./__generated__/collapsible.props";
import { getButtonStyles } from "./theme/styles";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

export const metaCollapsible: WsComponentMeta = {
  category: "radix",
  order: 5,
  type: "container",
  constraints: [
    {
      relation: "descendant",
      component: { $eq: "CollapsibleTrigger" },
    },
    {
      relation: "descendant",
      component: { $eq: "CollapsibleContent" },
    },
  ],
  presetStyle,
  icon: CollapsibleIcon,
  description:
    "An interactive component which expands and collapses some content, triggered by a button.",
  template: [
    {
      type: "instance",
      component: "Collapsible",
      props: [],
      children: [
        {
          type: "instance",
          component: "CollapsibleTrigger",
          children: [
            {
              type: "instance",
              component: "Button",
              styles: getButtonStyles("outline"),
              children: [
                {
                  type: "text",
                  value: "Click to toggle content",
                  placeholder: true,
                },
              ],
            },
          ],
        },
        {
          type: "instance",
          component: "CollapsibleContent",
          children: [
            {
              type: "instance",
              component: "Text",
              children: [
                {
                  type: "text",
                  value: "Collapsible Content",
                  placeholder: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const metaCollapsibleTrigger: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: TriggerIcon,
  stylable: false,
  constraints: {
    relation: "ancestor",
    component: { $eq: "Collapsible" },
  },
};

export const metaCollapsibleContent: WsComponentMeta = {
  category: "hidden",
  type: "container",
  presetStyle,
  icon: ContentIcon,
  constraints: {
    relation: "ancestor",
    component: { $eq: "Collapsible" },
  },
};

export const propsMetaCollapsible: WsComponentPropsMeta = {
  props: {
    ...propsCollapsible,
    onOpenChange: {
      type: "action",
      control: "action",
      required: false,
    },
  },
  initialProps: ["open", "onOpenChange"],
};

export const propsMetaCollapsibleTrigger: WsComponentPropsMeta = {
  props: propsCollapsibleTrigger,
};

export const propsMetaCollapsibleContent: WsComponentPropsMeta = {
  props: propsCollapsibleContent,
};
