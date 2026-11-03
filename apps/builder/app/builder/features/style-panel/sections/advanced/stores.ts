import { computed } from "nanostores";
import type { CssProperty } from "@webstudio-is/css-engine";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { $settings } from "~/builder/shared/client-settings";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { $computedStyleDeclarations } from "../../shared/model";
import { sections } from "../sections";

export const getAdvancedStyleSource = (styleDecl: ComputedStyleDecl) => {
  if (styleDecl.source.name === "preset") {
    return "preset";
  }
  if (styleDecl.source.name === "remote") {
    return styleDecl.source.instanceId === ROOT_INSTANCE_ID &&
      styleDecl.property.startsWith("--")
      ? "globalVariables"
      : "cascaded";
  }
};

export const $visibleAdvancedStyleDeclarations = computed(
  [$computedStyleDeclarations, $settings],
  (declarations, settings) =>
    declarations.filter((declaration) => {
      const source = getAdvancedStyleSource(declaration);
      return (
        (source !== "cascaded" || settings.showCascadedStyles) &&
        (source !== "preset" || settings.showPresetStyles) &&
        (source !== "globalVariables" || settings.showGlobalVariables)
      );
    })
);

export const $advancedStyleDeclarations = computed(
  [$visibleAdvancedStyleDeclarations, $settings],
  (visibleDeclarations, settings) => {
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
    for (const styleDecl of visibleDeclarations) {
      const showSource = getAdvancedStyleSource(styleDecl) !== undefined;
      if (styleDecl.source.name === "default") {
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
