import { FormTextFieldIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { input } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/input.props";
import * as tc from "./theme/tailwind-classes";

const presetStyle = {
  input,
} satisfies PresetStyle<"input">;

export const meta: WsComponentMeta = {
  category: "radix",
  type: "control",
  invalidAncestors: ["Button"],
  label: "Input",
  icon: FormTextFieldIcon,
  presetStyle,
  states: [
    ...defaultStates,
    { selector: ":disabled", label: "Disabled" },
    { selector: "::placeholder", label: "Placeholder" },
    { selector: "::file-selector-button", label: "File Selector Button" },
    // @todo share https://github.com/webstudio-is/webstudio-builder/issues/2102
    { selector: ":valid", label: "Valid" },
    { selector: ":invalid", label: "Invalid" },
    { selector: ":required", label: "Required" },
    { selector: ":optional", label: "Optional" },
    { selector: ":enabled", label: "Enabled" },
    { selector: ":read-only", label: "Read Only" },
    { selector: ":read-write", label: "Read Write" },
  ],
  order: 1,
  template: [
    {
      type: "instance",
      component: "Input",
      styles: [
        // flex h-10 w-full rounded-md border border-input bg-background
        // px-3 py-2 text-sm
        // ring-offset-background
        // file:border-0 file:bg-transparent file:text-sm file:font-medium
        // placeholder:text-muted-foreground
        // focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        // disabled:cursor-not-allowed disabled:opacity-50"
        tc.flex(),
        tc.h(10),
        tc.w("full"),
        tc.rounded("md"),
        tc.border(),
        tc.border("input"),
        tc.bg("background"),
        tc.px(3),
        tc.py(2),
        tc.text("sm"),
        tc.state(
          [tc.border(0), tc.bg("transparent"), tc.font("medium")].flat(),
          "::file-selector-button"
        ),
        tc.state(tc.text("mutedForeground"), "::placeholder"),
        tc.focusVisible(
          [tc.outline("none"), tc.ring("ring", 2, "background", 2)].flat()
        ),
        tc.disabled([tc.cursor("not-allowed"), tc.opacity(50)].flat()),
      ].flat(),

      children: [],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "name", "type", "placeholder", "required", "autoFocus"],
};
