// Mutation utilities own changing existing instances in the live tree: delete,
// reparent, wrap, unwrap, convert, and visibility toggles. Put operations that
// move or transform existing nodes here; use insert.ts for new content and
// slot.ts for shared Slot boundary rules.
import { toast } from "@webstudio-is/design-system";
import { builderApi } from "~/shared/builder-api";
import { showAttribute } from "@webstudio-is/react-sdk";
import { type Instance, isComponentDetachable } from "@webstudio-is/sdk";
import {
  $isContentMode,
  $isPreviewMode,
  $registeredComponentMetas,
  $selectedInstancePath,
  $selectedPage,
  $textEditingInstanceSelector,
  selectInstance,
} from "../nano-states";
import type { InstancePath } from "@webstudio-is/project-build/runtime";
import { $instances, $props } from "../sync/data-stores";
import { $instanceTags } from "~/builder/features/style-panel/shared/model";
import {
  type DroppableTarget,
  type InstanceSelector,
} from "@webstudio-is/project-build/runtime";
import { canUnwrapInstancePath } from "@webstudio-is/project-build/runtime";
import { canDeleteInstanceInContentMode } from "@webstudio-is/project-build/runtime";
import { executeRuntimeMutation } from "./data";

export const reparentInstance = (
  sourceInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  const result = executeRuntimeMutation({
    id: "instances.reparent",
    input: {
      sourceInstanceSelector,
      dropTarget,
    },
  });
  if (result !== undefined) {
    selectInstance(result.result.instanceSelector);
  }
};

export const deleteInstanceBySelector = (
  instanceSelector: undefined | InstanceSelector
) => {
  if (instanceSelector === undefined || instanceSelector.length < 2) {
    return;
  }
  return executeRuntimeMutation({
    id: "instances.deleteBySelector",
    input: { instanceSelector },
  });
};

export const canUnwrapInstance = (instancePath: InstancePath) => {
  return canUnwrapInstancePath({
    instancePath,
    rootInstanceId: $selectedPage.get()?.rootInstanceId,
    instances: $instances.get(),
    props: $props.get(),
    metas: $registeredComponentMetas.get(),
  });
};

export const toggleInstanceShow = (instanceId: Instance["id"]) => {
  const showProp = Array.from($props.get().values()).find(
    (prop) => prop.instanceId === instanceId && prop.name === showAttribute
  );
  if (showProp !== undefined && showProp.type !== "boolean") {
    return;
  }
  executeRuntimeMutation({
    id: "instances.updateProps",
    input: {
      updates: [
        {
          instanceId,
          name: showAttribute,
          type: "boolean",
          value: showProp?.type === "boolean" ? !showProp.value : false,
        },
      ],
    },
  });
};

export const wrapInstance = (component: string, tag?: string) => {
  const instancePath = $selectedInstancePath.get();
  // global root or body are selected
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  try {
    const [selectedItem] = instancePath;
    const result = executeRuntimeMutation({
      id: "instances.wrap",
      input: {
        instanceSelector: selectedItem.instanceSelector,
        component,
        tag,
      },
    });
    if (result !== undefined) {
      selectInstance(result.result.instanceSelector);
    }
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Cannot wrap instance"
    );
  }
};

export const convertInstance = (component: string, tag?: string) => {
  const instancePath = $selectedInstancePath.get();
  // global root or body are selected
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const instanceTags = $instanceTags.get();
  try {
    const [selectedItem] = instancePath;
    executeRuntimeMutation({
      id: "instances.convert",
      input: {
        instanceSelector: selectedItem.instanceSelector,
        component,
        tag,
        currentTag: instanceTags.get(selectedItem.instance.id),
      },
    });
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Cannot convert instance"
    );
  }
};

export const unwrapInstance = () => {
  const instancePath = $selectedInstancePath.get();
  if (instancePath === undefined || !canUnwrapInstance(instancePath)) {
    return;
  }
  try {
    const [selectedItem] = instancePath;
    const result = executeRuntimeMutation({
      id: "instances.unwrap",
      input: {
        instanceSelector: selectedItem.instanceSelector,
      },
    });
    if (result !== undefined) {
      selectInstance(result.result.instanceSelector);
    }
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Cannot unwrap instance"
    );
  }
};

export const deleteSelectedInstance = () => {
  if ($isPreviewMode.get()) {
    return;
  }
  const textEditingInstanceSelector = $textEditingInstanceSelector.get();
  const instancePath = $selectedInstancePath.get();
  // cannot delete instance while editing
  if (textEditingInstanceSelector) {
    return;
  }
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const [selectedItem] = instancePath;
  const selectedInstanceSelector = selectedItem.instanceSelector;
  const instances = $instances.get();
  if (!isComponentDetachable(selectedItem.instance.component)) {
    toast.error(
      "This instance can not be moved outside of its parent component."
    );
    return false;
  }

  if ($isContentMode.get()) {
    if (
      canDeleteInstanceInContentMode({
        instanceSelector: selectedInstanceSelector,
        instances,
      }) === false
    ) {
      builderApi.toast.info("You can't delete this instance in content mode.");
      return;
    }
  }

  const result = deleteInstanceBySelector(selectedInstanceSelector);
  if (result !== undefined && result.noop === false) {
    selectInstance(result.result.instanceSelector);
  }
};
