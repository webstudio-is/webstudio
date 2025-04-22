import { computed } from "nanostores";
import type { CssProperty } from "@webstudio-is/css-engine";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { $settings } from "~/builder/shared/client-settings";
import { $selectedInstance } from "~/shared/awareness";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { $computedStyleDeclarations } from "../../shared/model";
import { sections } from "../sections";

export const $advancedStyleDeclarations = computed(
  [$computedStyleDeclarations, $settings, $selectedInstance],
  (computedStyleDeclarations, settings, selectedInstance) => {
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
      // We don't want to show the massive amount of root variables on child instances.
      // @todo add filters to the UI to allow user decide.
      if (
        styleDecl.source.name === "remote" &&
        styleDecl.source.instanceId === ROOT_INSTANCE_ID &&
        styleDecl.source.instanceId !== selectedInstance?.id
      ) {
        continue;
      }
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
        settings.stylePanelMode === "advanced"
      ) {
        advancedStyles.set(styleDecl.property, styleDecl);
      }
    }

    return Array.from(advancedStyles.values());
  }
);
