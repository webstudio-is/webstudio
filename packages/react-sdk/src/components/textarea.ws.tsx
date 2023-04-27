import type { Style } from "@webstudio-is/css-data";
import { FormTextAreaIcon } from "@webstudio-is/icons";
import { textarea } from "../css/normalize";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { defaultTag } from "./textarea";
import { props } from "./__generated__/textarea.props";

const presetStyle = {
  textarea: {
    ...textarea,

    // it's hard to block or support well resize while on canvas
    resize: { type: "keyword", value: "none" },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "control",
  label: "Text Area",
  Icon: FormTextAreaIcon,
  presetStyle,
  states: [
    { selector: "::placeholder", label: "Placeholder" },
    { selector: ":hover", label: "Hover" },
    { selector: ":focus", label: "Focus" },
    { selector: ":valid", label: "Valid" },
    { selector: ":invalid", label: "Invalid" },
    { selector: ":required", label: "Required" },
    { selector: ":optional", label: "Optional" },
    { selector: ":disabled", label: "Disabled" },
    { selector: ":enabled", label: "Enabled" },
    { selector: ":read-only", label: "Read Only" },
    { selector: ":read-write", label: "Read Write" },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["name", "placeholder", "required", "autoFocus"],
};
