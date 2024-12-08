import { LinkIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { a } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./link";
import { props } from "./__generated__/link.props";

const presetStyle = {
  a: [
    ...a,
    {
      property: "minHeight",
      value: { type: "unit", unit: "em", value: 1 },
    },
    {
      property: "display",
      value: { type: "keyword", value: "inline-block" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  description:
    "Use a link to send your users to another page, section, or resource. Configure links in the Settings panel.",
  icon: LinkIcon,
  constraints: {
    relation: "ancestor",
    component: { $nin: ["Button", "Link"] },
  },
  presetStyle,
  order: 1,
  states: [
    ...defaultStates,
    {
      selector: ":visited",
      label: "Visited",
    },
    {
      category: "component-states",
      selector: "[aria-current=page]",
      label: "Current page",
    },
  ],
  template: [
    {
      type: "instance",
      component: "Link",
      children: [
        {
          type: "text",
          value: "Link text you can edit",
          placeholder: true,
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    href: {
      type: "string",
      control: "url",
      required: false,
    },
  },
  initialProps: ["id", "className", "href", "target", "download"],
};
