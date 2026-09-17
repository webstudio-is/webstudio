import { AlertIcon } from "@webstudio-is/icons/svg";
import {
  descendantComponent,
  type PresetStyle,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/alert.props";
import type { defaultTag } from "./alert";

const presetStyle = {
  div: [
    ...div,
    {
      property: "padding-top",
      value: { type: "unit", value: 16, unit: "px" },
    },
    {
      property: "padding-right",
      value: { type: "unit", value: 16, unit: "px" },
    },
    {
      property: "padding-bottom",
      value: { type: "unit", value: 16, unit: "px" },
    },
    {
      property: "padding-left",
      value: { type: "unit", value: 16, unit: "px" },
    },
    {
      property: "border-top-left-radius",
      value: { type: "unit", value: 8, unit: "px" },
    },
    {
      property: "border-top-right-radius",
      value: { type: "unit", value: 8, unit: "px" },
    },
    {
      property: "border-bottom-right-radius",
      value: { type: "unit", value: 8, unit: "px" },
    },
    {
      property: "border-bottom-left-radius",
      value: { type: "unit", value: 8, unit: "px" },
    },
    {
      property: "background-color",
      state: '[data-state="note"]',
      value: { type: "rgb", r: 239, g: 246, b: 255, alpha: 1 },
    },
    {
      property: "background-color",
      state: '[data-state="tip"]',
      value: { type: "rgb", r: 236, g: 254, b: 255, alpha: 1 },
    },
    {
      property: "background-color",
      state: '[data-state="important"]',
      value: { type: "rgb", r: 238, g: 242, b: 255, alpha: 1 },
    },
    {
      property: "background-color",
      state: '[data-state="warning"]',
      value: { type: "rgb", r: 245, g: 243, b: 255, alpha: 1 },
    },
    {
      property: "background-color",
      state: '[data-state="caution"]',
      value: { type: "rgb", r: 250, g: 245, b: 255, alpha: 1 },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  icon: AlertIcon,
  description: "Highlight a note, tip, important detail, warning, or caution.",
  contentModel: {
    category: "instance",
    children: ["instance", descendantComponent],
  },
  presetStyle,
  states: [
    { label: "Note", selector: '[data-state="note"]' },
    { label: "Tip", selector: '[data-state="tip"]' },
    { label: "Important", selector: '[data-state="important"]' },
    { label: "Warning", selector: '[data-state="warning"]' },
    { label: "Caution", selector: '[data-state="caution"]' },
  ],
  initialProps: ["variant", "id", "class"],
  props: {
    ...props,
    variant: {
      ...props.variant,
      label: "Variant",
      contentMode: true,
    },
  },
};
