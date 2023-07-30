import { RadioUncheckedIcon, RadioCheckedIcon } from "@webstudio-is/icons/svg";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import {
  propsRadixCollapsible,
  propsRadixCollapsibleContent,
  propsRadixCollapsibleTrigger,
} from "./__generated__/radix-collapsible.props";

export const metaRadixCollapsible: WsComponentMeta = {
  category: "radix",
  type: "container",
  label: "Collapsible",
  icon: RadioUncheckedIcon,
  template: [
    {
      type: "instance",
      component: "RadixCollapsible",
      props: [
        {
          name: "open",
          type: "boolean",
          value: false,
          dataSourceRef: {
            type: "variable",
            name: "collapsibleOpen",
          },
        },
        {
          name: "onOpenChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["open"],
              code: `collapsibleOpen = open`,
            },
          ],
        },
      ],
      children: [
        {
          type: "instance",
          component: "RadixCollapsibleTrigger",
          children: [
            {
              type: "instance",
              component: "Button",
              children: [{ type: "text", value: "Click to toggle content" }],
            },
          ],
        },
        {
          type: "instance",
          component: "RadixCollapsibleContent",
          children: [
            {
              type: "instance",
              component: "Text",
              children: [{ type: "text", value: "Collapsible Content" }],
            },
          ],
        },
      ],
    },
  ],
};

export const metaRadixCollapsibleTrigger: WsComponentMeta = {
  category: "hidden",
  type: "container",
  label: "Collapsible Trigger",
  icon: RadioCheckedIcon,
  stylable: false,
  detachable: false,
};

export const metaRadixCollapsibleContent: WsComponentMeta = {
  category: "hidden",
  type: "container",
  label: "Collapsible Content",
  icon: RadioCheckedIcon,
  detachable: false,
};

export const propsMetaRadixCollapsible: WsComponentPropsMeta = {
  props: {
    ...propsRadixCollapsible,
    onOpenChange: {
      type: "action",
      control: "action",
      required: false,
    },
  },
  initialProps: ["open", "onOpenChange"],
};

export const propsMetaRadixCollapsibleTrigger: WsComponentPropsMeta = {
  props: propsRadixCollapsibleTrigger,
};

export const propsMetaRadixCollapsibleContent: WsComponentPropsMeta = {
  props: propsRadixCollapsibleContent,
};
