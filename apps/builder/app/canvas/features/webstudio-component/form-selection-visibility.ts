import type { Instances } from "@webstudio-is/sdk";
import {
  areInstanceSelectorsEqual,
  type InstanceSelector,
} from "@webstudio-is/project-build/runtime";

/** Reveal the selected managed Form slot and its ancestor path only while authoring. */
export const getCanvasFormVisibility = ({
  show,
  isPreviewMode,
  instanceSelector,
  selectedSelector,
  instances,
}: {
  show: unknown;
  isPreviewMode: boolean;
  instanceSelector: InstanceSelector;
  selectedSelector: InstanceSelector | undefined;
  instances: Instances;
}) => {
  if (show !== false) {
    return true;
  }
  if (isPreviewMode || !selectedSelector) {
    return false;
  }
  const selected = instances.get(selectedSelector[0]);
  if (!selected) {
    return false;
  }
  const component = selected.component.split(":").at(-1);
  let isManagedFormSlot = component === "Form";
  if (
    !isManagedFormSlot &&
    ["form content", "success message", "error message"].includes(
      selected.label?.toLowerCase() ?? ""
    )
  ) {
    const form = selectedSelector
      .slice(1)
      .map((id) => instances.get(id))
      .find((instance) => {
        const component = instance?.component.split(":").at(-1);
        return component === "Form" || component === "WebhookForm";
      });
    isManagedFormSlot = form?.component.split(":").at(-1) === "Form";
  }
  if (!isManagedFormSlot || instanceSelector.length > selectedSelector.length) {
    return false;
  }
  return areInstanceSelectorsEqual(
    selectedSelector.slice(selectedSelector.length - instanceSelector.length),
    instanceSelector
  );
};
