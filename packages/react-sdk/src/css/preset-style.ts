import { useMemo, useState } from "react";
import { createValueContainer, useValue } from "react-nano-state";
import type { PresetStyle } from "../db";
import { getComponentMeta, getComponentNames } from "../components";
import type { StyleProperty } from "@webstudio-is/css-data";

const presetStyleContainer = createValueContainer<PresetStyle>([]);

export const useSetPresetStyle = (presetStyle: PresetStyle) => {
  useState(() => {
    presetStyleContainer.value = presetStyle;
  });
};

export const usePresetStyle = () => {
  const [presetStyle] = useValue(presetStyleContainer);

  const result = useMemo(() => {
    const result: PresetStyle = [];
    const storedComponents = new Set<string>();

    // find all preset styles for component
    for (const item of presetStyle) {
      storedComponents.add(item.component);
      result.push(item);
    }

    // add hardcoded preset style
    const components = getComponentNames();
    for (const component of components) {
      // skip if already stored in db
      if (storedComponents.has(component)) {
        continue;
      }
      const meta = getComponentMeta(component);
      if (meta.presetStyle === undefined) {
        continue;
      }
      for (const [property, value] of Object.entries(meta.presetStyle)) {
        result.push({
          component,
          property: property as StyleProperty,
          value,
        });
      }
    }

    return result;
  }, [presetStyle]);

  return result;
};
