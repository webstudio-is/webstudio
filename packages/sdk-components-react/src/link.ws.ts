import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { a } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./link";
import { props } from "./__generated__/link.props";

const presetStyle = {
  a: [
    ...a,
    {
      property: "display",
      value: { type: "keyword", value: "inline-block" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  presetStyle,
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
  initialProps: ["id", "class", "href", "target", "prefetch", "download"],
  props: {
    ...props,
    href: {
      type: "string",
      control: "url",
      required: false,
    },
  },
};
