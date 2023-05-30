import { FormTextAreaIcon } from "@webstudio-is/icons/svg";
import { textarea } from "../css/normalize";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
  type PresetStyle,
  defaultStates,
} from "./component-meta";
import type { defaultTag } from "./textarea";
import { props } from "./__generated__/textarea.props";

const presetStyle = {
  textarea: [
    ...textarea,
    // resize doesn't work well while on canvas
    { property: "resize", value: { type: "keyword", value: "none" } },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "control",
  label: "Text Area",
  icon: FormTextAreaIcon,
  presetStyle,
  order: 4,
  states: [
    ...defaultStates,
    { selector: "::placeholder", label: "Placeholder" },
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
