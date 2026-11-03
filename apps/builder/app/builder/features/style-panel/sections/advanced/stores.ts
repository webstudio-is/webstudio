import { computed } from "nanostores";
import type { CssProperty } from "@webstudio-is/css-engine";
import { $settings } from "~/builder/shared/client-settings";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { $computedStyleDeclarations } from "../../shared/model";
import { sections } from "../sections";

export const $advancedStyleDeclarations = computed(
  [$computedStyleDeclarations, $settings],
  (computedStyleDeclarations, settings) => {
    const advancedStyles = new Map<
      ComputedStyleDecl["property"],
      ComputedStyleDecl
    >();
    // All properties used by the panels except the advanced panel
    const visualProperties = new Set<CssProperty>([]);
    for (const { properties } of sections.values()) {
      for (const property of properties) {
        visualProperties.add(property);
      }
    }
    for (const styleDecl of computedStyleDeclarations) {
      if (styleDecl.source.name === "remote" && !settings.showCascadedStyles) {
        continue;
      }
      if (styleDecl.source.name === "preset" && !settings.showPresetStyles) {
        continue;
      }
      const showSource =
        styleDecl.source.name === "remote" ||
        styleDecl.source.name === "preset";
      // ignore predefined styles in advanced mode
      // @todo will be deleted https://github.com/webstudio-is/webstudio/issues/4871
      if (
        styleDecl.source.name === "default" &&
        settings.stylePanelMode === "advanced"
      ) {
        continue;
      }
      const { property, listed } = styleDecl;
      // When property is listed, it was added from advanced panel.
      // If we are in advanced mode, we show them all.
      if (
        visualProperties.has(property) === false ||
        listed ||
        settings.stylePanelMode === "advanced" ||
        showSource
      ) {
        advancedStyles.set(styleDecl.property, styleDecl);
      }
    }

    return Array.from(advancedStyles.values());
  }
);
