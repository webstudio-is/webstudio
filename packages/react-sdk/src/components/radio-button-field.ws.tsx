import { RadioCheckedIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/radio-button-field.props";
import type { defaultTag } from "./radio-button-field";
import type { Style } from "@webstudio-is/css-data";
import { label } from "../css/normalize";

const presetStyle = {
  label: {
    ...label,
    display: {
      type: "keyword",
      value: "flex",
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
  label: "Radio Button Field",
  Icon: RadioCheckedIcon,
  presetStyle,
  children: [
    { type: "instance", component: "RadioButton", props: [], children: [] },
    {
      type: "instance",
      component: "TextBlock",
      props: [],
      children: [{ type: "text", value: "Radio" }],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
