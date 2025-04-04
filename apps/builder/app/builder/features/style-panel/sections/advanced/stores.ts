import { computed } from "nanostores";
import type { CssProperty } from "@webstudio-is/css-engine";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { $settings } from "~/builder/shared/client-settings";
import { $selectedInstance } from "~/shared/awareness";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { $computedStyleDeclarations } from "../../shared/model";
import { sections } from "../sections";

// @todo will be fully deleted https://github.com/webstudio-is/webstudio/issues/4871
const initialProperties = new Set<CssProperty>([
  "cursor",
  "mix-blend-mode",
  "opacity",
  "pointer-events",
  "user-select",
]);

export const $advancedStyleDeclarations = computed(
  [$computedStyleDeclarations, $settings, $selectedInstance],
  (computedStyleDeclarations, settings, selectedInstance) => {
    const advancedStyles: Array<ComputedStyleDecl> = [];
    // All properties used by the panels except the advanced panel
    const visualProperties = new Set<CssProperty>([]);
    for (const { properties } of sections.values()) {
      for (const property of properties) {
        visualProperties.add(property);
      }
    }
    for (const styleDecl of computedStyleDeclarations) {
      // We don't want to show the massive amount of root variables on child instances.
      // @todo add filters to the UI to allow user decide.
      if (
        styleDecl.source.name === "remote" &&
        styleDecl.source.instanceId === ROOT_INSTANCE_ID &&
        styleDecl.source.instanceId !== selectedInstance?.id
      ) {
        continue;
      }
      const { property, listed } = styleDecl;
      // When property is listed, it was added from advanced panel.
      // If we are in advanced mode, we show them all.
      if (
        visualProperties.has(property) === false ||
        listed ||
        settings.stylePanelMode === "advanced"
      ) {
        advancedStyles.push(styleDecl);
      }
    }
    // In advanced mode we assume user knows the properties they need, so we don't need to show these.
    // @todo https://github.com/webstudio-is/webstudio/issues/4871
    if (settings.stylePanelMode !== "advanced") {
      for (const property of initialProperties) {
        const styleDecl = computedStyleDeclarations.find(
          (styleDecl) => styleDecl.property === property
        );
        if (styleDecl) {
          advancedStyles.push(styleDecl);
        }
      }
    }

    return advancedStyles;
  }
);
