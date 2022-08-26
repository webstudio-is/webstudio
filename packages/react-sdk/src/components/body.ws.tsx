import { BodyIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Body } from "./body";

const defaultStyle = {
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

const meta: WsComponentMeta<typeof Body> = {
  Icon: BodyIcon,
  Component: Body,
  canAcceptChildren: true,
  isContentEditable: false,
  label: "Body",
  isInlineOnly: false,
  isListed: false,
  defaultStyle,
};

export default meta;
