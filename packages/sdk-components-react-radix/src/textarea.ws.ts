import { FormTextAreaIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { textarea } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/textarea.props";
import * as tc from "./theme/tailwind-classes";

const presetStyle = {
  textarea,
} satisfies PresetStyle<"textarea">;

export const meta: WsComponentMeta = {
  category: "radix",
  order: 104,
  type: "control",
  invalidAncestors: ["Button"],
  icon: FormTextAreaIcon,
  presetStyle,
  states: [
    ...defaultStates,
    { selector: ":disabled", label: "Disabled" },
    { selector: "::placeholder", label: "Placeholder" },
    // @todo share https://github.com/webstudio-is/webstudio-builder/issues/2102
    { selector: ":valid", label: "Valid" },
    { selector: ":invalid", label: "Invalid" },
    { selector: ":required", label: "Required" },
    { selector: ":optional", label: "Optional" },
    { selector: ":enabled", label: "Enabled" },
    { selector: ":read-only", label: "Read Only" },
    { selector: ":read-write", label: "Read Write" },
  ],
  template: [
    {
      type: "instance",
      component: "Textarea",
      styles: [
        // flex min-h-[80px] w-full rounded-md
        // border border-input bg-background
        // px-3 py-2 text-sm ring-offset-background
        // placeholder:text-muted-foreground
        // focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        // focus-visible:ring-offset-2
        // disabled:cursor-not-allowed disabled:opacity-50

        tc.flex(),
        tc.minH(20),
        tc.w("full"),
        tc.rounded("md"),
        tc.border(),
        tc.border("input"),
        tc.bg("background"),
        tc.px(3),
        tc.py(2),
        tc.text("sm"),
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
  initialProps: ["id", "name", "placeholder", "required", "autoFocus"],
};
