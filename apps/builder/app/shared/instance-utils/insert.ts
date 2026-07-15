// Insert utilities own deciding where newly created or pasted instance content
// should be placed. Put insert target resolution and insertion commands here,
// while fragment cloning stays in fragment.ts and existing-instance moves stay
// in mutation.ts.
import { toast } from "@webstudio-is/design-system";
import { type WebstudioFragment, elementComponent } from "@webstudio-is/sdk";
import type { ConflictResolution } from "../token-conflict-dialog";
import {
  $registeredComponentMetas,
  $registeredTemplates,
  $selectedInstanceSelector,
  $selectedPage,
  selectInstance,
} from "../nano-states";
import { $instances, $project, $props } from "../sync/data-stores";
import {
  resolveComponentInsertTarget,
  resolveFragmentInsertTarget,
  type InsertTarget,
} from "@webstudio-is/project-build/runtime";
import { createComponentTemplateFragment } from "@webstudio-is/project-build/runtime";
import { builderRuntimeContext } from "@webstudio-is/project-build/runtime";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { executeRuntimeMutation } from "./data";

const getRootInstanceId = () => $selectedPage.get()?.rootInstanceId;

const onMissingTarget = () => {
  toast.error("Cannot insert: the target no longer exists.");
};

const onRootTarget = () => {
  toast.error(`Cannot insert into Global root`);
};

const onNoInsertMatch = (fragment: Pick<WebstudioFragment, "instances">) => {
  return (message: string) => {
    const component = fragment.instances[0].component;
    const label = getInstanceLabel({ component });
    toast.warn(message || `"${label}" has no place here`);
  };
};

const onNoComponentInsertMatch = (component: string) => {
  return (message: string) => {
    const label = getInstanceLabel({ component });
    toast.warn(message || `"${label}" has no place here`);
  };
};

const getFragmentInsertTarget = (
  fragment: WebstudioFragment,
  from?: Insertable
) => {
  const rootInstanceId = getRootInstanceId();
  if (rootInstanceId === undefined) {
    return;
  }
  const instances = $instances.get();
  return resolveFragmentInsertTarget({
    fragment,
    instances,
    props: $props.get(),
    metas: $registeredComponentMetas.get(),
    rootInstanceId,
    selectedInstanceSelector: $selectedInstanceSelector.get(),
    from,
    onRootTarget,
    onMissingTarget,
    onNoMatch: onNoInsertMatch(fragment),
  });
};

export const insertWebstudioElementAt = (insertable?: Insertable) => {
  const target = getComponentInsertTarget(elementComponent, insertable);
  if (target === undefined) {
    return false;
  }
  const result = executeRuntimeMutation({
    id: "instances.insertComponent",
    input: {
      parentInstanceId: target.parentInstanceId,
      component: elementComponent,
      tag: target.tag,
      insertIndex: target.insertIndex,
    },
  });
  const newInstanceId = result?.result.rootInstanceIds[0];
  if (newInstanceId === undefined) {
    return false;
  }
  const parentSelector =
    result?.result.parentInstanceId === undefined ||
    result.result.parentInstanceId === target.parentInstanceId
      ? target.parentSelector
      : [result.result.parentInstanceId, ...target.parentSelector];
  selectInstance([newInstanceId, ...parentSelector]);
  return true;
};

const getComponentInsertTarget = (component: string, from?: Insertable) => {
  const rootInstanceId = getRootInstanceId();
  if (rootInstanceId === undefined) {
    return;
  }
  return resolveComponentInsertTarget({
    component,
    templates: $registeredTemplates.get(),
    context: builderRuntimeContext,
    instances: $instances.get(),
    props: $props.get(),
    metas: $registeredComponentMetas.get(),
    rootInstanceId,
    selectedInstanceSelector: $selectedInstanceSelector.get(),
    from,
    onRootTarget,
    onMissingTarget,
    onNoMatch: onNoComponentInsertMatch(component),
  });
};

export const insertWebstudioComponentAt = (
  component: string,
  insertable?: Insertable
) => {
  const target = getComponentInsertTarget(component, insertable);
  if (target === undefined) {
    return false;
  }
  const result = executeRuntimeMutation({
    id: "instances.insertComponent",
    input: {
      parentInstanceId: target.parentInstanceId,
      component,
      tag: target.tag,
      insertIndex: target.insertIndex,
    },
  });
  const newInstanceId = result?.result.rootInstanceIds[0];
  if (result !== undefined && newInstanceId !== undefined) {
    const parentSelector =
      result.result.parentInstanceId === target.parentInstanceId
        ? target.parentSelector
        : [result.result.parentInstanceId, ...target.parentSelector];
    selectInstance([newInstanceId, ...parentSelector]);
  }
  if (result?.result.didMergeBreakpointsDueToLimit === true) {
    toast.info(
      "Some breakpoints were merged because the project reached the breakpoint limit."
    );
  }
  return result !== undefined;
};

export const insertWebstudioFragmentAt = (
  fragment: WebstudioFragment,
  insertable?: Insertable,
  conflictResolution?: ConflictResolution,
  options?: { contentMode?: boolean; onBreakpointLimitMerge?: () => void }
): boolean => {
  const hasChildren = fragment.children.length > 0;
  const hasTokens = fragment.styleSources.length > 0;
  if (!hasChildren && !hasTokens) {
    return false;
  }
  // Tokens-only fragment: insert tokens/breakpoints/styles without instances
  if (!hasChildren && hasTokens) {
    const projectId = $project.get()?.id;
    if (projectId === undefined) {
      return false;
    }
    const result = executeRuntimeMutation({
      id: "instances.insertFragment",
      input: {
        fragment,
        conflictResolution,
        contentMode: options?.contentMode,
      },
    });
    if (result?.result.didMergeBreakpointsDueToLimit === true) {
      options?.onBreakpointLimitMerge?.();
    }
    return result !== undefined;
  }
  const target = getFragmentInsertTarget(fragment, insertable);
  if ($project.get() === undefined || target === undefined) {
    return false;
  }
  const result = executeRuntimeMutation({
    id: "instances.insertFragment",
    input: {
      parentInstanceId: target.parentInstanceId,
      fragment,
      conflictResolution,
      contentMode: options?.contentMode,
      insertIndex: target.insertIndex,
    },
  });
  const newInstanceId = result?.result.rootInstanceIds[0];
  if (result !== undefined && newInstanceId !== undefined) {
    const resultParentInstanceId =
      "parentInstanceId" in result.result
        ? result.result.parentInstanceId
        : undefined;
    const nextParentSelector =
      resultParentInstanceId === undefined ||
      resultParentInstanceId === target.parentInstanceId
        ? target.parentSelector
        : [resultParentInstanceId, ...target.parentSelector];
    selectInstance([newInstanceId, ...nextParentSelector]);
  }
  if (result?.result.didMergeBreakpointsDueToLimit === true) {
    options?.onBreakpointLimitMerge?.();
  }
  return result !== undefined;
};

export const getComponentTemplateData = (
  componentOrTemplate: string
): WebstudioFragment => {
  return createComponentTemplateFragment({
    component: componentOrTemplate,
    templates: $registeredTemplates.get(),
    createId: builderRuntimeContext.createId,
  });
};

export type Insertable = InsertTarget;

export const findClosestInsertable = (
  fragment: WebstudioFragment,
  from?: Insertable
): undefined | Insertable => {
  const rootInstanceId = getRootInstanceId();
  if (rootInstanceId === undefined) {
    return;
  }
  const target = resolveFragmentInsertTarget({
    fragment,
    instances: $instances.get(),
    props: $props.get(),
    metas: $registeredComponentMetas.get(),
    rootInstanceId,
    selectedInstanceSelector: $selectedInstanceSelector.get(),
    from,
    onRootTarget,
    onMissingTarget,
    onNoMatch: onNoInsertMatch(fragment),
  });
  if (target === undefined) {
    return;
  }
  return {
    parentSelector: target.parentSelector,
    position: target.insertIndex ?? "end",
  };
};
