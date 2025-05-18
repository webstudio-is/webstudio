import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { select } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./select";
import { props } from "./__generated__/select.props";

const presetStyle = {
  select: [
    ...select,
    {
      property: "display",
      value: { type: "keyword", value: "block" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  presetStyle,
  states: [
    ...defaultStates,
    { selector: "::placeholder", label: "Placeholder" },
    { selector: ":valid", label: "Valid" },
    { selector: ":invalid", label: "Invalid" },
    { selector: ":required", label: "Required" },
    { selector: ":optional", label: "Optional" },
  ],
  initialProps: [
    "id",
    "class",
    "name",
    "value",
    "multiple",
    "required",
    "autofocus",
  ],
  props,
};
