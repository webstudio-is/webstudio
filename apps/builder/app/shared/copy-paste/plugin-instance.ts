import store from "immerhin";
import { z } from "zod";
import {
  Breakpoint,
  findTreeInstanceIds,
  Instance,
  Prop,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
  StyleSourceSelections,
} from "@webstudio-is/project-build";
import {
  propsStore,
  stylesStore,
  selectedInstanceSelectorStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  instancesStore,
  selectedPageStore,
  breakpointsStore,
  selectedStyleSourceSelectorStore,
} from "../nano-states";
import {
  type InstanceSelector,
  findClosestDroppableTarget,
  insertInstancesCopyMutable,
  insertPropsCopyMutable,
  insertStylesCopyMutable,
  insertStyleSourcesCopyMutable,
  insertStyleSourceSelectionsCopyMutable,
  findSubtreeLocalStyleSources,
  mergeNewBreakpointsMutable,
} from "../tree-utils";
import { deleteInstance } from "../instance-utils";
import { getMapValuesBy, getMapValuesByKeysSet } from "../array-utils";

const version = "@webstudio/instance/v0.1";

const InstanceData = z.object({
  breakpoints: z.array(Breakpoint),
  instances: z.array(Instance),
  props: z.array(Prop),
  styleSourceSelections: z.array(StyleSourceSelection),
  styleSources: z.array(StyleSource),
  styles: z.array(StyleDecl),
});

type InstanceData = z.infer<typeof InstanceData>;

const findTreeStyleSourceIds = (
  styleSourceSelections: StyleSourceSelections,
  treeInstanceIds: Set<Instance["id"]>
) => {
  const treeStyleSourceIds = new Set<StyleSource["id"]>();
  for (const { instanceId, values } of styleSourceSelections.values()) {
    // skip selections outside of tree
    if (treeInstanceIds.has(instanceId) === false) {
      continue;
    }
    for (const styleSourceId of values) {
      treeStyleSourceIds.add(styleSourceId);
    }
  }
  return treeStyleSourceIds;
};

const getTreeData = (targetInstanceSelector: InstanceSelector) => {
  // @todo tell user they can't copy or cut root
  if (targetInstanceSelector.length === 1) {
    return;
  }

  const [targetInstanceId] = targetInstanceSelector;
  const instances = instancesStore.get();
  const treeInstanceIds = findTreeInstanceIds(instances, targetInstanceId);
  const styleSourceSelections = styleSourceSelectionsStore.get();
  const treeStyleSourceIds = findTreeStyleSourceIds(
    styleSourceSelections,
    treeInstanceIds
  );

  // first item is guaranteed root of copied tree
  const treeInstances = getMapValuesByKeysSet(instances, treeInstanceIds);

  const treeProps = getMapValuesBy(propsStore.get(), (prop) =>
    treeInstanceIds.has(prop.instanceId)
  );

  const treeStyleSourceSelections = getMapValuesByKeysSet(
    styleSourceSelections,
    treeInstanceIds
  );

  const treeStyleSources = getMapValuesByKeysSet(
    styleSourcesStore.get(),
    treeStyleSourceIds
  );

  const treeStyles = getMapValuesBy(stylesStore.get(), (styleDecl) =>
    treeStyleSourceIds.has(styleDecl.styleSourceId)
  );

  const treeBreapointIds = new Set<Breakpoint["id"]>();
  for (const styleDecl of treeStyles) {
    treeBreapointIds.add(styleDecl.breakpointId);
  }
  const treeBreapoints = getMapValuesByKeysSet(
    breakpointsStore.get(),
    treeBreapointIds
  );

  return {
    breakpoints: treeBreapoints,
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
  const selectedPage = selectedPageStore.get();
  if (data === undefined || selectedPage === undefined) {
    return;
  }
  // paste to the root if nothing is selected
  const instanceSelector = selectedInstanceSelectorStore.get() ?? [
    selectedPage.rootInstanceId,
  ];
  const dragComponent = data.instances[0].component;
  const dropTarget = findClosestDroppableTarget(
    instancesStore.get(),
    instanceSelector,
    [dragComponent]
  );
  if (dropTarget === undefined) {
    return;
  }
  store.createTransaction(
    [
      breakpointsStore,
      instancesStore,
      styleSourcesStore,
      propsStore,
      styleSourceSelectionsStore,
      stylesStore,
    ],
    (
      breakpoints,
      instances,
      styleSources,
      props,
      styleSourceSelections,
      styles
    ) => {
      const mergedBreakpointIds = mergeNewBreakpointsMutable(
        breakpoints,
        data.breakpoints
      );

      const copiedInstanceIds = insertInstancesCopyMutable(
        instances,
        data.instances,
        dropTarget
      );

      // find all local style sources of copied instances
      const newStyleSourceIds = findSubtreeLocalStyleSources(
        new Set(copiedInstanceIds.values()),
        new Map(
          data.styleSources.map((styleSource) => [styleSource.id, styleSource])
        ),
        new Map(
          data.styleSourceSelections.map((styleSourceSelection) => [
            styleSourceSelection.instanceId,
            styleSourceSelection,
          ])
        )
      );

      const copiedStyleSourceIds = insertStyleSourcesCopyMutable(
        styleSources,
        data.styleSources,
        newStyleSourceIds
      );

      insertPropsCopyMutable(props, data.props, copiedInstanceIds);
      insertStyleSourceSelectionsCopyMutable(
        styleSourceSelections,
        data.styleSourceSelections,
        copiedInstanceIds,
        copiedStyleSourceIds
      );
      insertStylesCopyMutable(
        styles,
        data.styles,
        copiedStyleSourceIds,
        mergedBreakpointIds
      );

      // first item is guaranteed root of copied tree
      const copiedRootInstanceId = Array.from(copiedInstanceIds.values())[0];
      selectedInstanceSelectorStore.set([
        copiedRootInstanceId,
        ...instanceSelector,
      ]);
      selectedStyleSourceSelectorStore.set(undefined);
    }
  );
};

export const onCopy = () => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const data = getTreeData(selectedInstanceSelector);
  if (data === undefined) {
    return;
  }
  return stringify(data);
};

export const onCut = () => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  // @todo tell user they can't delete root
  if (selectedInstanceSelector.length === 1) {
    return;
  }
  const data = getTreeData(selectedInstanceSelector);
  if (data === undefined) {
    return;
  }
  deleteInstance(selectedInstanceSelector);
  if (data === undefined) {
    return;
  }
  return stringify(data);
};
