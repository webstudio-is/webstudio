import { computed } from "nanostores";
import type { CssProperty, CssStyleMap } from "@webstudio-is/css-engine";
import { $matchingBreakpoints, getDefinedStyles } from "../../shared/model";
import { sections } from "../sections";
import {
  $registeredComponentMetas,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { $selectedInstancePath } from "~/shared/awareness";
import { $settings } from "~/builder/shared/client-settings";

// @todo will be fully deleted https://github.com/webstudio-is/webstudio/issues/4871
const initialProperties = new Set<CssProperty>([
  "cursor",
  "mix-blend-mode",
  "opacity",
  "pointer-events",
  "user-select",
]);

export const $advancedStylesLonghands = computed(
  [
    // prevent showing properties inherited from root
    // to not bloat advanced panel
    $selectedInstancePath,
    $registeredComponentMetas,
    $styleSourceSelections,
    $matchingBreakpoints,
    $styles,
    $settings,
  ],
  (
    instancePath,
    metas,
    styleSourceSelections,
    matchingBreakpoints,
    styles,
    settings
  ) => {
    const advancedStyles: CssStyleMap = new Map();

    if (instancePath === undefined) {
      return advancedStyles;
    }

    const definedStyles = getDefinedStyles({
      instancePath,
      metas,
      matchingBreakpoints,
      styleSourceSelections,
      styles,
    });

    // All properties used by the panels except the advanced panel
    const visualProperties = new Set<CssProperty>([]);
    for (const { properties } of sections.values()) {
      for (const property of properties) {
        visualProperties.add(property);
      }
    }
    for (const style of definedStyles) {
      const { property, value, listed } = style;
      const hyphenatedProperty = property;
      // When property is listed, it was added from advanced panel.
      // If we are in advanced mode, we show them all.
      if (
        visualProperties.has(hyphenatedProperty) === false ||
        listed ||
        settings.stylePanelMode === "advanced"
      ) {
        advancedStyles.set(hyphenatedProperty, value);
      }
    }
    // In advanced mode we assume user knows the properties they need, so we don't need to show these.
    // @todo https://github.com/webstudio-is/webstudio/issues/4871
    if (settings.stylePanelMode !== "advanced") {
      for (const initialProperty of initialProperties) {
        advancedStyles.set(initialProperty, { type: "guaranteedInvalid" });
      }
    }

    return advancedStyles;
  }
);
