import { computed } from "nanostores";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { $settings } from "~/builder/shared/client-settings";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { $computedStyleDeclarations } from "../../shared/model";

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
