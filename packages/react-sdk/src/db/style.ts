import { z } from "zod";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { SharedStyleValue } from "@webstudio-is/css-data";
import {
  type ComponentName,
  getComponentMeta,
  getComponentNames,
} from "../components";

export type PresetStylesItem = {
  component: ComponentName;
  property: StyleProperty;
  value: StyleValue;
};

// @todo can't figure out how to make property to be enum
export const PresetStylesItem = z.object({
  component: z.enum(getComponentNames() as [ComponentName]),
  property: z.string(),
  value: SharedStyleValue,
}) as z.ZodType<PresetStylesItem>;

export const PresetStyles = z.array(PresetStylesItem);

export type PresetStyles = z.infer<typeof PresetStyles>;

export const findMissingPresetStyles = (
  presetStyles: PresetStyles,
  components: ComponentName[]
) => {
  const populatedComponents = new Set();
  for (const style of presetStyles) {
    populatedComponents.add(style.component);
  }
  const missingPresetStyles: PresetStyles = [];
  for (const component of components) {
    if (populatedComponents.has(component)) {
      continue;
    }
    const meta = getComponentMeta(component);
    if (meta.presetStyle === undefined) {
      continue;
    }
    for (const [property, value] of Object.entries(meta.presetStyle)) {
      missingPresetStyles.push({
        component,
        property: property as StyleProperty,
        value,
      });
    }
  }
  return missingPresetStyles;
};
