import { ButtonElementIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  EmbedTemplateInstance,
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

export const template = (props?: {
  props?: EmbedTemplateInstance["props"];
  children?: WsComponentMeta["template"];
}): NonNullable<WsComponentMeta["template"]> => [
  {
    type: "instance",
    component: "Button",
    tokens: ["button", "buttonPrimary", "buttonMd"],
    children: props?.children ?? [{ type: "text", value: "Button" }],
    props: props?.props,
  },
];

export const meta: WsComponentMeta = {
  category: "radix",
  order: 101,
  type: "container",
  invalidAncestors: ["Button"],
  icon: ButtonElementIcon,
  states: [
    ...defaultStates,
    { selector: ":disabled", label: "Disabled" },
    { selector: ":enabled", label: "Enabled" },
  ],
  presetStyle,
  presetTokens: {
    button: {
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
      ].flat(),
    },

    // VARIANT
    buttonPrimary: {
      variant: "variant",
      styles: [
        // default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        tc.bg("primary"),
        tc.text("primaryForeground"),
        tc.state([tc.bg("primary", 90)].flat(), ":hover"),
      ].flat(),
    },
    buttonDestructive: {
      variant: "variant",
      styles: [
        // destructive:'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        tc.bg("destructive"),
        tc.text("destructiveForeground"),
        tc.state([tc.bg("destructive", 90)].flat(), ":hover"),
      ].flat(),
    },
    buttonOutline: {
      variant: "variant",
      styles: [
        // outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        tc.border(),
        tc.border("input"),
        tc.bg("background"),
        tc.state(
          [tc.bg("accent", 90), tc.text("accentForeground")].flat(),
          ":hover"
        ),
      ].flat(),
    },
    buttonSecondary: {
      variant: "variant",
      styles: [
        // secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        tc.bg("secondary"),
        tc.text("secondaryForeground"),
        tc.state([tc.bg("secondary", 80)].flat(), ":hover"),
      ].flat(),
    },
    buttonGhost: {
      variant: "variant",
      styles: [
        // ghost: 'hover:bg-accent hover:text-accent-foreground',
        tc.state(
          [tc.bg("accent"), tc.text("accentForeground")].flat(),
          ":hover"
        ),
      ].flat(),
    },
    buttonLink: {
      variant: "variant",
      styles: [
        // link: 'text-primary underline-offset-4 hover:underline',
        tc.text("primary"),
        tc.underlineOffset(4),
        tc.state([tc.underline()].flat(), ":hover"),
      ].flat(),
    },

    // SIZE
    buttonMd: {
      variant: "size",
      styles: [
        // default: 'h-10 px-4 py-2',
        tc.h(10),
        tc.px(4),
        tc.py(2),
      ].flat(),
    },
    buttonSm: {
      variant: "size",
      styles: [
        // sm: 'h-9 rounded-md px-3',
        tc.h(10),
        tc.px(3),
      ].flat(),
    },
    buttonLg: {
      variant: "size",
      styles: [
        // lg: 'h-11 rounded-md px-8',
        tc.h(11),
        tc.px(8),
      ].flat(),
    },
    buttonIcon: {
      variant: "size",
      styles: [
        // icon: 'h-10 w-10',
        tc.h(10),
        tc.w(10),
      ].flat(),
    },
  },
  template: template(),
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "type", "variant", "size", "aria-label"],
};
