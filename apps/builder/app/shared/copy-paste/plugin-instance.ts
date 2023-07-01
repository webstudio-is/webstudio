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
  assetsStore,
  projectStore,
  registeredComponentMetasStore,
  dataSourceValuesStore,
} from "../nano-states";
import {
  type InstanceSelector,
  insertInstancesCopyMutable,
  insertPropsCopyMutable,
  insertStylesCopyMutable,
  insertStyleSourcesCopyMutable,
  insertStyleSourceSelectionsCopyMutable,
  findLocalStyleSourcesWithinInstances,
  mergeNewBreakpointsMutable,
} from "../tree-utils";
import { deleteInstance, findClosestDroppableTarget } from "../instance-utils";
import { getMapValuesBy, getMapValuesByKeysSet } from "../array-utils";
import { Asset } from "@webstudio-is/asset-uploader";

const version = "@webstudio/instance/v0.1";

const InstanceData = z.object({
  breakpoints: z.array(Breakpoint),
  instances: z.array(Instance),
  props: z.array(Prop),
  styleSourceSelections: z.array(StyleSourceSelection),
  styleSources: z.array(StyleSource),
  styles: z.array(StyleDecl),
  assets: z.array(Asset),
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

const getAssetsUsedInStyle = (
  style: StyleDecl[],
  foundAssetsIds = new Set<Asset["id"]>()
) => {
  const fontFamilies = new Set<string>();

  const processValues = (values: StyleDecl["value"][]) => {
    for (const value of values) {
      if (value.type === "fontFamily") {
        for (const fontFamily of value.value) {
          fontFamilies.add(fontFamily);
        }
        continue;
      }
      if (value.type === "image") {
        if (value.value.type === "asset") {
          foundAssetsIds.add(value.value.value);
        }
        continue;
      }
      if (value.type === "var") {
        processValues(value.fallbacks);
        continue;
      }
      if (value.type === "tuple" || value.type === "layers") {
        processValues(value.value);
        continue;
      }
      if (
        value.type === "unit" ||
        value.type === "keyword" ||
        value.type === "unparsed" ||
        value.type === "invalid" ||
        value.type === "unset" ||
        value.type === "rgb"
      ) {
        continue;
      }
      value satisfies never;
    }
  };

  processValues(style.map(({ value }) => value));

  for (const asset of assetsStore.get().values()) {
    if (asset?.type === "font" && fontFamilies.has(asset.meta.family)) {
      foundAssetsIds.add(asset.id);
    }
  }

  return foundAssetsIds;
};

const getAssetsUsedInProps = (props: Prop[], foundAssetsIds = new Set()) => {
  for (const prop of props) {
    if (prop.type === "asset") {
      foundAssetsIds.add(prop.value);
      continue;
    }
    if (
      prop.type === "number" ||
      prop.type === "string" ||
      prop.type === "boolean" ||
      prop.type === "page" ||
      prop.type === "string[]" ||
      prop.type === "dataSource"
    ) {
      continue;
    }
    prop satisfies never;
  }
  return foundAssetsIds;
};

const getPropTypeAndValue = (value: unknown) => {
  if (typeof value === "boolean") {
    return { type: "boolean", value } as const;
  }
  if (typeof value === "number") {
    return { type: "number", value } as const;
  }
  if (typeof value === "string") {
    return { type: "string", value } as const;
  }
  if (Array.isArray(value)) {
    return { type: "string[]", value } as const;
  }
  throw Error(`Unexpected prop value ${value}`);
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

  const dataSourceValues = dataSourceValuesStore.get();
  const treeProps = getMapValuesBy(propsStore.get(), (prop) =>
    treeInstanceIds.has(prop.instanceId)
  ).map((prop) => {
    // unbind data source from prop
    // @todo improve the logic and allow to copy data sources for scoped components
    if (prop.type === "dataSource") {
      const value = dataSourceValues.get(prop.value);
      return {
        id: prop.id,
        instanceId: prop.instanceId,
        name: prop.name,
        ...getPropTypeAndValue(value),
      } satisfies Prop;
    }
    return prop;
  });

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

  const treeAssets = getMapValuesByKeysSet(
    assetsStore.get(),
    getAssetsUsedInProps(treeProps, getAssetsUsedInStyle(treeStyles))
  );

  return {
    breakpoints: treeBreapoints,
    instances: treeInstances,
    styleSources: treeStyleSources,
    props: treeProps,
    styleSourceSelections: treeStyleSourceSelections,
    styles: treeStyles,
    assets: treeAssets,
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
  const project = projectStore.get();

  if (
    data === undefined ||
    selectedPage === undefined ||
    project === undefined
  ) {
    return;
  }

  // paste to the root if nothing is selected
  const instanceSelector = selectedInstanceSelectorStore.get() ?? [
    selectedPage.rootInstanceId,
  ];
  const dragComponent = data.instances[0].component;
  const dropTarget = findClosestDroppableTarget(
    registeredComponentMetasStore.get(),
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
      assetsStore,
    ],
    (
      breakpoints,
      instances,
      styleSources,
      props,
      styleSourceSelections,
      styles,
      assets
    ) => {
      for (const asset of data.assets) {
        // asset can be already present if pasting to the same project
        if (assets.has(asset.id) === false) {
          // we use the same asset.id so the references are preserved
          assets.set(asset.id, { ...asset, projectId: project.id });
        }
      }

      const mergedBreakpointIds = mergeNewBreakpointsMutable(
        breakpoints,
        data.breakpoints
      );

      const copiedInstanceIds = insertInstancesCopyMutable(
        instances,
        props,
        registeredComponentMetasStore.get(),
        data.instances,
        dropTarget
      );

      const localStyleSourceIds = findLocalStyleSourcesWithinInstances(
        data.styleSources,
        data.styleSourceSelections,
        new Set(copiedInstanceIds.keys())
      );

      const copiedStyleSourceIds = insertStyleSourcesCopyMutable(
        styleSources,
        data.styleSources,
        localStyleSourceIds
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
