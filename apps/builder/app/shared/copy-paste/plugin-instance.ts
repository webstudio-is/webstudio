import store from "immerhin";
import { z } from "zod";
import {
  InstancesItem,
  Prop,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/project-build";
import {
  propsStore,
  stylesStore,
  selectedInstanceIdStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  instancesIndexStore,
  instancesStore,
  selectedPageStore,
} from "../nano-states";
import {
  findClosestDroppableTarget,
  findSubtreeLocalStyleSources,
  findTreeInstances,
  insertInstancesCopyMutable,
  insertPropsCopyMutable,
  insertStylesCopyMutable,
  insertStyleSourcesCopyMutable,
  insertStyleSourceSelectionsCopyMutable,
} from "../tree-utils";
import { deleteInstance } from "../instance-utils";

const version = "@webstudio/instance/v0.1";

const InstanceData = z.object({
  instances: z.array(InstancesItem),
  props: z.array(Prop),
  styleSourceSelections: z.array(StyleSourceSelection),
  styleSources: z.array(StyleSource),
  styles: z.array(StyleDecl),
});

type InstanceData = z.infer<typeof InstanceData>;

const getTreeData = (targetInstanceId: string) => {
  const rootInstanceId = selectedPageStore.get()?.rootInstanceId;
  // @todo tell user they can't copy or cut root
  if (targetInstanceId === rootInstanceId) {
    return;
  }

  const instances = instancesStore.get();
  const treeInstanceIds = findTreeInstances(instances, targetInstanceId);
  const styleSources = styleSourcesStore.get();
  const styleSourceSelections = styleSourceSelectionsStore.get();
  const subtreeLocalStyleSourceIds = findSubtreeLocalStyleSources(
    treeInstanceIds,
    styleSources,
    styleSourceSelections
  );

  // first item is guaranteed root of copied tree
  const treeInstances: InstancesItem[] = [];
  for (const instanceId of treeInstanceIds) {
    const instance = instances.get(instanceId);
    if (instance) {
      treeInstances.push(instance);
    }
  }

  const treeStyleSources: StyleSource[] = [];
  for (const styleSourceId of subtreeLocalStyleSourceIds) {
    const styleSource = styleSources.get(styleSourceId);
    if (styleSource) {
      treeStyleSources.push(styleSource);
    }
  }

  const props = propsStore.get();
  const treeProps: Prop[] = [];
  for (const prop of props.values()) {
    if (treeInstanceIds.has(prop.instanceId)) {
      treeProps.push(prop);
    }
  }

  const treeStyleSourceSelections: StyleSourceSelection[] = [];
  for (const styleSourceSelection of styleSourceSelections.values()) {
    if (treeInstanceIds.has(styleSourceSelection.instanceId)) {
      treeStyleSourceSelections.push(styleSourceSelection);
    }
  }

  const styles = stylesStore.get();
  const treeStyles: StyleDecl[] = [];
  for (const styleDecl of styles.values()) {
    if (subtreeLocalStyleSourceIds.has(styleDecl.styleSourceId)) {
      treeStyles.push(styleDecl);
    }
  }

  return {
    instances: treeInstances,
    styleSources: treeStyleSources,
    props: treeProps,
    styleSourceSelections: treeStyleSourceSelections,
    styles: treeStyles,
  };
};

const stringify = (data: InstanceData) => {
  return JSON.stringify({ [version]: data });
};

const ClipboardData = z.object({ [version]: InstanceData });

const parse = (clipboardData: string): InstanceData | undefined => {
  try {
    const data = ClipboardData.parse(JSON.parse(clipboardData));
    return data[version];
  } catch {
    return;
  }
};

export const mimeType = "application/json";

export const onPaste = (clipboardData: string) => {
  const data = parse(clipboardData);
  if (data === undefined) {
    return;
  }
  const dropTarget = findClosestDroppableTarget(
    instancesIndexStore.get(),
    selectedInstanceIdStore.get()
  );
  store.createTransaction(
    [
      instancesStore,
      styleSourcesStore,
      propsStore,
      styleSourceSelectionsStore,
      stylesStore,
    ],
    (instances, styleSources, props, styleSourceSelections, styles) => {
      const copiedInstanceIds = insertInstancesCopyMutable(
        instances,
        data.instances,
        dropTarget
      );
      const copiedStyleSourceIds = insertStyleSourcesCopyMutable(
        styleSources,
        data.styleSources
      );
      insertPropsCopyMutable(props, data.props, copiedInstanceIds);
      insertStyleSourceSelectionsCopyMutable(
        styleSourceSelections,
        data.styleSourceSelections,
        copiedInstanceIds,
        copiedStyleSourceIds
      );
      insertStylesCopyMutable(styles, data.styles, copiedStyleSourceIds);

      // first item is guaranteed root of copied tree
      const copiedRootInstanceId = Array.from(copiedInstanceIds.values())[0];
      selectedInstanceIdStore.set(copiedRootInstanceId);
    }
  );
};

export const onCopy = () => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  if (selectedInstanceId === undefined) {
    return;
  }
  const data = getTreeData(selectedInstanceId);
  if (data === undefined) {
    return;
  }
  return stringify(data);
};

export const onCut = () => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  if (selectedInstanceId === undefined) {
    return;
  }
  const data = getTreeData(selectedInstanceId);
  if (data === undefined) {
    return;
  }
  deleteInstance(selectedInstanceId);
  if (data === undefined) {
    return;
  }
  return stringify(data);
};
