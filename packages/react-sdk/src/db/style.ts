import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { SharedStyleValue } from "@webstudio-is/css-data";
import { type ComponentName, getComponentMeta } from "../components";
import { z } from "zod";

export type PresetStyleItem = {
  component: ComponentName;
  property: StyleProperty;
  value: StyleValue;
};

// @todo can't figure out how to make component and property to be enum
export const zPresetStyleItem = z.object({
  component: z.string(),
  property: z.string(),
  value: SharedStyleValue,
}) as z.ZodType<PresetStyleItem>;

export const zPresetStyle = z.array(zPresetStyleItem);

export type PresetStyle = z.infer<typeof zPresetStyle>;

export const findMissingPresetStyle = (
  presetStyle: PresetStyle,
  components: ComponentName[]
) => {
  const populatedComponents = new Set();
  for (const style of presetStyle) {
    populatedComponents.add(style.component);
  }
  const missingPresetStyle: PresetStyle = [];
  for (const component of components) {
    if (populatedComponents.has(component)) {
      continue;
    }
    const meta = getComponentMeta(component);
    if (meta.presetStyle === undefined) {
      continue;
    }
    for (const [property, value] of Object.entries(meta.presetStyle)) {
      missingPresetStyle.push({
        component,
        property: property as StyleProperty,
        value,
      });
    }
  }
  return missingPresetStyle;
};
