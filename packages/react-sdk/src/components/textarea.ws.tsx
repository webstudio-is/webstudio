import type { Style } from "@webstudio-is/css-data";
import { FormTextAreaIcon } from "@webstudio-is/icons";
import { textarea } from "../css/normalize";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { defaultTag } from "./textarea";
import { props } from "./__generated__/textarea.props";

const presetStyle = {
  textarea,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "control",
  label: "Text Area",
  Icon: FormTextAreaIcon,
  presetStyle,
  states: [
    // @todo: are all of these make sense for textarea?
    { selector: "::placeholder", label: "Placeholder" },
    { selector: ":valid", label: "Valid" },
    { selector: ":invalid", label: "Invalid" },
    { selector: ":required", label: "Required" },
    { selector: ":disabled", label: "Disabled" },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["name", "placeholder", "required", "autoFocus"],
};
