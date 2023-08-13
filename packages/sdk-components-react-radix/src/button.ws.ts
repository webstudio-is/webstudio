import { ButtonElementIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { button } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/button.props";
import * as tc from "./theme/tailwind-classes";

const presetStyle = {
  button,
} satisfies PresetStyle<"button">;

export const meta: WsComponentMeta = {
  category: "radix",
  type: "container",
  invalidAncestors: ["Button"],
  icon: ButtonElementIcon,
  presetStyle,
  states: [
    ...defaultStates,
    { selector: ":disabled", label: "Disabled" },
    { selector: ":enabled", label: "Enabled" },

    { selector: "[data-variant=default]", label: "Default" },
    { selector: "[data-variant=default]:hover", label: "Default Hover" },

    { selector: "[data-variant=destructive]", label: "Destructive" },
    {
      selector: "[data-variant=destructive]:hover",
      label: "Destructive Hover",
    },

    { selector: "[data-variant=outline]", label: "Outline" },
    { selector: "[data-variant=outline]:hover", label: "Outline Hover" },

    { selector: "[data-variant=secondary]", label: "Secondary" },
    { selector: "[data-variant=secondary]:hover", label: "Secondary Hover" },

    { selector: "[data-variant=ghost]", label: "Ghost" },
    { selector: "[data-variant=ghost]:hover", label: "Ghost Hover" },

    { selector: "[data-variant=link]", label: "Link" },
    { selector: "[data-variant=link]:hover", label: "Link Hover" },
  ],
  order: 1,
  template: [
    {
      type: "instance",
      component: "Button",
      styles: [
        // 'inline-flex items-center justify-center rounded-md text-sm font-medium
        // ring-offset-background transition-colors
        // focus-visible:outline-none focus-visible:ring-2
        // focus-visible:ring-ring focus-visible:ring-offset-2
        // disabled:pointer-events-none disabled:opacity-50'
        tc.border(0),
        tc.bg("transparent"),
        tc.inlineFlex(),
        tc.items("center"),
        tc.justify("center"),
        tc.rounded("md"),
        tc.text("sm"),
        tc.font("medium"),
        tc.focusVisible(
          [tc.outline("none"), tc.ring("ring", 2, "background", 2)].flat()
        ),
        tc.state(
          [tc.pointerEvents("none"), tc.opacity(50)].flat(),
          ":disabled"
        ),

        // VARIANT
        // default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        tc.state(
          [tc.bg("primary"), tc.text("primaryForeground")].flat(),
          "[data-variant=default]"
        ),
        tc.state(
          [[tc.bg("primary", 90)].flat()].flat(),
          "[data-variant=default]:hover"
        ),

        // destructive:'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        tc.state(
          [tc.bg("destructive"), tc.text("destructiveForeground")].flat(),
          "[data-variant=destructive]"
        ),
        tc.state(
          [[tc.bg("destructive", 90)].flat()].flat(),
          "[data-variant=destructive]:hover"
        ),

        // outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        tc.state(
          [tc.border(), tc.border("input"), tc.bg("background")].flat(),
          "[data-variant=outline]"
        ),
        tc.state(
          [[tc.bg("accent", 90), tc.text("accentForeground")].flat()].flat(),
          "[data-variant=outline]:hover"
        ),

        // secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        tc.state(
          [tc.bg("secondary"), tc.text("secondaryForeground")].flat(),
          "[data-variant=secondary]"
        ),
        tc.state(
          [[tc.bg("secondary", 80)].flat()].flat(),
          "[data-variant=secondary]:hover"
        ),

        // ghost: 'hover:bg-accent hover:text-accent-foreground',
        tc.state(
          [[tc.bg("accent"), tc.text("accentForeground")].flat()].flat(),
          "[data-variant=ghost]:hover"
        ),

        // link: 'text-primary underline-offset-4 hover:underline',
        tc.state(
          [tc.text("primary"), tc.underlineOffset(4)].flat(),
          "[data-variant=link]"
        ),
        tc.state([[tc.underline()].flat()].flat(), "[data-variant=link]:hover"),

        // SIZE
        // default: 'h-10 px-4 py-2',
        tc.state([tc.h(10), tc.px(4), tc.py(2)].flat(), "[data-size=default]"),

        // sm: 'h-9 rounded-md px-3',
        tc.state([tc.h(10), tc.px(3)].flat(), "[data-size=sm]"),

        // lg: 'h-11 rounded-md px-8',
        tc.state([tc.h(11), tc.px(8)].flat(), "[data-size=lg]"),

        // icon: 'h-10 w-10',
        tc.state([tc.h(10), tc.w(10)].flat(), "[data-size=icon]"),
      ].flat(),

      children: [{ type: "text", value: "Button you can edit" }],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "type", "variant", "size", "aria-label"],
};
