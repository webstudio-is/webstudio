import store from "immerhin";
import { z } from "zod";
import {
  findTreeInstanceIds,
  Instance,
  InstancesItem,
  Prop,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
  StyleSourceSelections,
} from "@webstudio-is/project-build";
import { Asset } from "@webstudio-is/asset-uploader";
import {
  propsStore,
  stylesStore,
  selectedInstanceSelectorStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  instancesStore,
  selectedPageStore,
  assetsStore,
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
} from "../tree-utils";
import { deleteInstance } from "../instance-utils";
import { getMapValuesBy, getMapValuesByKeysSet } from "../array-utils";

const version = "@webstudio/instance/v0.1";

const InstanceData = z.object({
  instances: z.array(InstancesItem),
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

const getTreeData = (
  targetInstanceSelector: InstanceSelector
): InstanceData | undefined => {
  // @todo tell user they can't copy or cut root
  if (targetInstanceSelector.length === 1) {
    return;
  }

  const assets = assetsStore.get();

  const [targetInstanceId] = targetInstanceSelector;
  const instances = instancesStore.get();
  const treeInstanceIds = findTreeInstanceIds(instances, targetInstanceId);
  const styleSourceSelections = styleSourceSelectionsStore.get();
  const treeStyleSourceIds = findTreeStyleSourceIds(
    styleSourceSelections,
    treeInstanceIds
  );

  const assetIds = new Set<Asset["id"]>();
  const fontFamilies = new Set<string>();

  // first item is guaranteed root of copied tree
  const treeInstances = getMapValuesByKeysSet(instances, treeInstanceIds);

  const treeProps = getMapValuesBy(propsStore.get(), (prop) => {
    if (treeInstanceIds.has(prop.instanceId) === false) {
      return false;
    }

    if (prop.type === "asset") {
      assetIds.add(prop.value);
    }

    return true;
  });

  const treeStyleSourceSelections = getMapValuesByKeysSet(
    styleSourceSelections,
    treeInstanceIds
  );

  const treeStyleSources = getMapValuesByKeysSet(
    styleSourcesStore.get(),
    treeStyleSourceIds
  );

  const treeStyles = getMapValuesBy(stylesStore.get(), (styleDecl) => {
    if (treeStyleSourceIds.has(styleDecl.styleSourceId) === false) {
      return false;
    }

    const value = styleDecl.value;

    if (value.type === "image") {
      assetIds.add(value.value.value.id);
    }

    if (value.type === "fontFamily") {
      for (const fontFamily of value.value) {
        fontFamilies.add(fontFamily);
      }
    }

    return true;
  });

  for (const asset of assets.values()) {
    if (asset.type === "font" && fontFamilies.has(asset.meta.family)) {
      assetIds.add(asset.id);
    }
  }

  const treeAssets = getMapValuesByKeysSet(assets, assetIds);

  return {
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
  if (data === undefined || selectedPage === undefined) {
    return;
  }
  // paste to the root if nothing is selected
  const instanceSelector = selectedInstanceSelectorStore.get() ?? [
    selectedPage.rootInstanceId,
  ];
  const dropTarget = findClosestDroppableTarget(
    instancesStore.get(),
    instanceSelector
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
      insertStylesCopyMutable(styles, data.styles, copiedStyleSourceIds);

      // first item is guaranteed root of copied tree
      const copiedRootInstanceId = Array.from(copiedInstanceIds.values())[0];
      selectedInstanceSelectorStore.set([
        copiedRootInstanceId,
        ...instanceSelector,
      ]);
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
