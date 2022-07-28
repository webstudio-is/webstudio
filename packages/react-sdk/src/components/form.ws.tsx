import { FormIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Form } from "./form";

const defaultStyle = {
  minHeight: {
    type: "unit",
    unit: "px",
    value: 20,
  },
  boxSizing: {
    type: "keyword",
    value: "border-box",
  },
};

export default {
  Icon: FormIcon,
  Component: Form,
  defaultStyle,
  canAcceptChild: () => true,
  isContentEditable: false,
  isInlineOnly: false,
  label: "Form",
} as WsComponentMeta<typeof Form>;
