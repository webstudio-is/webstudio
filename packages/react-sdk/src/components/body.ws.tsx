import { BodyIcon } from "@webstudio-is/icons";
import { type WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import props from "./__generated__/body.props.json";

const presetStyle = {
  marginTop: {
    type: "unit",
    unit: "px",
    value: 0,
  },
  marginRight: {
    type: "unit",
    unit: "px",
    value: 0,
  },
  marginBottom: {
    type: "unit",
    unit: "px",
    value: 0,
  },
  marginLeft: {
    type: "unit",
    unit: "px",
    value: 0,
  },
  minHeight: {
    type: "unit",
    unit: "%",
    value: 100,
  },
  backgroundColor: {
    type: "keyword",
    value: "white",
  },
  fontFamily: {
    type: "keyword",
    value: "Arial",
  },
  fontSize: {
    type: "unit",
    unit: "px",
    value: 14,
  },
  lineHeight: {
    type: "unit",
    unit: "number",
    value: 1.5,
  },
  color: {
    type: "keyword",
    value: "#232323",
  },
} as const;

export const meta: WsComponentMeta = {
  type: "body",
  label: "Body",
  Icon: BodyIcon,
  presetStyle,
};

export const propsMeta = WsComponentPropsMeta.parse({
  props,
});
