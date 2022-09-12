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
} as const;

const meta: WsComponentMeta<typeof Form> = {
  Icon: FormIcon,
  Component: Form,
  defaultStyle,
  canAcceptChildren: true,
  isContentEditable: false,
  isInlineOnly: false,
  isListed: true,
  label: "Form",
};

export default meta;
