import { BodyIcon } from "@webstudio-is/icons";
import { body } from "../css/normalize";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/body.props";
import type { defaultTag } from "./body";

const presetStyle = {
  body: [
    ...body,

    {
      property: "minHeight",
      value: { type: "unit", unit: "%", value: 100 },
    },
    {
      property: "fontFamily",
      value: { type: "keyword", value: "Arial" },
    },
    {
      property: "fontSize",
      value: { type: "unit", unit: "px", value: 14 },
    },
    {
      property: "lineHeight",
      value: { type: "unit", unit: "number", value: 1.5 },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "container",
  label: "Body",
  Icon: BodyIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
