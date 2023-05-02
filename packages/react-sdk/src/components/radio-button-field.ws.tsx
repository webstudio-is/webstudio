import { RadioCheckedIcon } from "@webstudio-is/icons";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
  PresetStyle,
} from "./component-meta";
import { props } from "./__generated__/radio-button-field.props";
import type { defaultTag } from "./radio-button-field";
import { label } from "../css/normalize";

const presetStyle = {
  label: [
    ...label,
    { property: "display", value: { type: "keyword", value: "flex" } },
  ],
} satisfies PresetStyle<typeof defaultTag>;

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
