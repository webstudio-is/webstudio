import { computed } from "nanostores";
import { type StyleMap, type StyleProperty } from "@webstudio-is/css-engine";
import { $matchingBreakpoints, getDefinedStyles } from "../../shared/model";
import { sections } from "../sections";
import {
  $registeredComponentMetas,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { $selectedInstancePath } from "~/shared/awareness";
import { $settings } from "~/builder/shared/client-settings";

const initialProperties = new Set<StyleProperty>([
  "cursor",
  "mixBlendMode",
  "opacity",
  "pointerEvents",
  "userSelect",
]);

export const $advancedStyles = computed(
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
    const advancedStyles: StyleMap = new Map();

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
    const visualProperties = new Set<StyleProperty>([]);
    for (const { properties } of sections.values()) {
      for (const property of properties) {
        visualProperties.add(property);
      }
    }
    for (const style of definedStyles) {
      const { property, value, listed } = style;
      // When property is listed, it was added from advanced panel.
      // If we are in advanced mode, we show them all.
      if (listed || settings.stylePanelMode === "advanced") {
        advancedStyles.set(property, value);
      }
    }
    // In advanced mode we assume user knows the properties they need, so we don't need to show these.
    // @todo we need to find a better place for them in any case
    if (settings.stylePanelMode !== "advanced") {
      for (const initialProperty of initialProperties) {
        advancedStyles.set(initialProperty, { type: "unset", value: "" });
      }
    }
    return advancedStyles;
  }
);
