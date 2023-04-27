import type { Style } from "@webstudio-is/css-data";
import { RadioCheckedIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { defaultTag } from "./radio-button";
import { input } from "../css/normalize";
import { props } from "./__generated__/radio-button.props";

const presetStyle = {
  input,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  type: "control",
  label: "Radio Button",
  Icon: RadioCheckedIcon,
  presetStyle,
  states: [
    { selector: ":checked", label: "Checked" },
    { selector: ":hover", label: "Hover" },
    { selector: ":focus", label: "Focus" },
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
  initialProps: ["name"],
};
