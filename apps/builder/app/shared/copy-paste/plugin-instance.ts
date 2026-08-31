import {
  breakpointPasteLimitWarning,
  extractWebstudioFragment,
  findChildReferenceIndex,
  findSafeFragmentPasteTarget,
  getCommonAncestorSelector,
  getInstancePath,
  getPasteRootInstanceIds,
  getFragmentContentModelWarnings,
  mergeWebstudioFragments,
  type InstanceSelector,
  sortInstancePathsForChildMutation,
} from "@webstudio-is/project-build/runtime";
import {
  instanceTransferDataVersion,
  instancesTransferDataVersion,
  parseInstanceTransferData,
  type InstanceTransferData,
  type InstancesTransferData,
} from "@webstudio-is/project-build/transfer";
import { findClosestInsertable } from "../instance-utils/insert";
import {
  executeRuntimeMutationAsync,
  getWebstudioData,
} from "../instance-utils/data";
import { type Insertable } from "../instance-utils/insert";
import { shallowEqual } from "shallow-equal";
import { toast } from "@webstudio-is/design-system";
import {
  blockComponent,
  contentBlockSourceProp,
  getContentBlockSource,
  isMdxFileAsset,
  type Instance,
  type WebstudioFragment,
  isComponentDetachable,
} from "@webstudio-is/sdk";
import { $assetFolders, $instances, $project } from "~/shared/sync/data-stores";
import { deleteInstanceBySelector } from "../instance-utils/mutation";
import {
  $allSelectedInstanceSelectors,
  clearInstanceSelection,
  $selectedInstancePath,
  $selectedInstanceSelector,
  $registeredComponentMetas,
  $variableValuesByInstanceSelector,
  selectInstances,
} from "~/shared/nano-states";
import { builderApi } from "../builder-api";
import { pasteHandled, pasteIgnored, type Plugin } from "./copy-paste";
import { resolveFragmentTokenConflicts } from "../resolve-token-conflicts";
import { reportFragmentContentModelWarnings } from "./fragment-utils";
import { transferFragmentAssets } from "./asset-transfer-utils";
import {
  isRepeatedContentBlockOccurrence,
  parseContentBlockRenderScope,
  resolveContentBlockOccurrenceAssetId,
} from "../content-block-source-utils";
import { rewriteTransferredDocumentAssetReferences } from "./mdx-asset-transfer";
import {
  createClipboardAssetPaths,
  hasDynamicContentBlockSource,
  prepareConnectedContentBlockFragment,
  resolveRepeatedContentBlockSourcesForCopy,
} from "./content-block-fragment";
import {
  $externalContentRoots,
  getExternalContentSourceSelector,
} from "../external-content-mutations";

const invalidPasteDataMessage =
  "Could not paste Webstudio instance data. The clipboard data appears to be incomplete or invalid.";

const getTreeData = (
  instanceSelector: InstanceSelector,
  { showToast = true }: { showToast?: boolean } = {}
): InstanceTransferData | undefined => {
  const instances = $instances.get();
  const [targetInstanceId] = instanceSelector;
  const instance = instances.get(targetInstanceId);
  if (instance && !isComponentDetachable(instance.component)) {
    if (showToast) {
      toast.error(
        "This instance can not be moved outside of its parent component."
      );
    }
    return;
  }

  // @todo tell user they can't copy or cut root
  if (instanceSelector.length === 1) {
    return;
  }

  const data = getWebstudioData();
  const project = $project.get();
  const sourceInstanceSelector =
    instance?.component === blockComponent
      ? getExternalContentSourceSelector({
          selector: instanceSelector,
          roots: $externalContentRoots.get(),
        })?.sourceSelector
      : undefined;
  const copyInstanceSelector = sourceInstanceSelector ?? instanceSelector;
  let fragment = extractWebstudioFragment(data, copyInstanceSelector[0]);
  let renderScopes: ReadonlySet<string> | undefined;
  const isRepeatedOccurrence = isRepeatedContentBlockOccurrence({
    instanceSelector,
    instances,
  });
  if (isRepeatedOccurrence) {
    const resolved = resolveRepeatedContentBlockSourcesForCopy({
      fragment,
      selectedInstanceSelector: copyInstanceSelector,
      occurrences: Array.from($externalContentRoots.get().values()).flatMap(
        (root) => {
          const sourceInstanceSelector = parseContentBlockRenderScope(
            root.sourceRenderScope ?? root.renderScope ?? ""
          );
          const sourceBlockInstanceId =
            root.sourceBlockInstanceId ?? root.blockInstanceId;
          return root.identity === undefined ||
            sourceInstanceSelector === undefined
            ? []
            : [
                {
                  sourceBlockInstanceId,
                  sourceRenderScope:
                    root.sourceRenderScope ?? root.renderScope ?? "",
                  sourceInstanceSelector,
                  assetId: root.identity.assetId,
                },
              ];
        }
      ),
    });
    fragment = resolved.fragment;
    renderScopes = resolved.renderScopes;
  }
  if (instance?.component === blockComponent) {
    const source = getContentBlockSource({
      blockInstanceId: copyInstanceSelector[0],
      props: data.props.values(),
    });
    const resolvedAssetId =
      source?.type === "expression"
        ? resolveContentBlockOccurrenceAssetId({
            source,
            instanceSelector,
            variableValuesByRenderScope:
              $variableValuesByInstanceSelector.get(),
          })
        : undefined;
    const resolvedAsset =
      resolvedAssetId === undefined
        ? undefined
        : data.assets.get(resolvedAssetId);
    if (resolvedAsset !== undefined && isMdxFileAsset(resolvedAsset)) {
      fragment = {
        ...fragment,
        props: fragment.props.map((prop) =>
          prop.instanceId === copyInstanceSelector[0] &&
          prop.name === contentBlockSourceProp
            ? { ...prop, type: "asset" as const, value: resolvedAsset.id }
            : prop
        ),
      };
    }
  }
  fragment = prepareConnectedContentBlockFragment({
    fragment,
    projectId: project?.id,
    assets: data.assets,
    renderScopes,
  });
  const hasDynamicContentSource = hasDynamicContentBlockSource(fragment);
  if (
    showToast &&
    instance?.component !== blockComponent &&
    hasDynamicContentSource
  ) {
    toast.warn(
      "Dynamic MDX sources are copied from the Collection items currently rendered on the canvas."
    );
  }
  return {
    sourceOrigin: window.location.origin,
    assetPaths: createClipboardAssetPaths(fragment.assets, $assetFolders.get()),
    instanceSelector: copyInstanceSelector,
    ...fragment,
  };
};

const stringify = (data: InstanceTransferData) => {
  return JSON.stringify({ [instanceTransferDataVersion]: data });
};

const stringifyMultiRoot = (data: InstancesTransferData) => {
  return JSON.stringify({ [instancesTransferDataVersion]: data });
};

const stringifyMultiRootSelection = (selectedData: InstanceTransferData[]) => {
  const firstData = selectedData[0];
  if (firstData === undefined) {
    return;
  }
  const rootInstanceIds = selectedData.map((data) => data.instanceSelector[0]);
  return stringifyMultiRoot({
    sourceOrigin: firstData.sourceOrigin,
    assetPaths: Object.assign(
      {},
      ...selectedData.map(({ assetPaths }) => assetPaths ?? {})
    ),
    rootInstanceIds,
    fragment: mergeWebstudioFragments(rootInstanceIds, selectedData),
  });
};

const reportSkippedSelectedInstances = (operation: "copied" | "cut") => {
  builderApi.toast.info(`Some selected instances could not be ${operation}.`);
};

const findMultiSelectionInsertable = (
  fragment: WebstudioFragment
): undefined | Insertable => {
  const selectedInstanceSelectors = $allSelectedInstanceSelectors.get();
  if (selectedInstanceSelectors.length < 2) {
    return;
  }
  const instances = $instances.get();
  const selectedPaths = selectedInstanceSelectors
    .map((instanceSelector) => getInstancePath(instanceSelector, instances))
    .filter((path): path is NonNullable<typeof path> => path !== undefined);
  if (selectedPaths.length < 2) {
    return;
  }

  const directParentSelector = selectedPaths[0][1]?.instanceSelector;
  const hasSameDirectParent =
    directParentSelector !== undefined &&
    selectedPaths.every((path) =>
      shallowEqual(path[1]?.instanceSelector, directParentSelector)
    );
  if (hasSameDirectParent) {
    const parentInstance = instances.get(directParentSelector[0]);
    if (parentInstance === undefined) {
      return;
    }
    const selectedSiblingIndexes = selectedPaths.map((path) =>
      findChildReferenceIndex(parentInstance.children, path[0].instance.id)
    );
    if (selectedSiblingIndexes.includes(-1)) {
      return;
    }
    const lastSelectedSiblingIndex = Math.max(...selectedSiblingIndexes);
    return findPasteTargetForFragment(fragment, {
      parentSelector: directParentSelector,
      position: lastSelectedSiblingIndex + 1,
    });
  }

  const commonAncestorSelector = getCommonAncestorSelector(
    selectedPaths.map((path) => path[0].instanceSelector)
  );
  if (commonAncestorSelector === undefined) {
    return;
  }
  return findPasteTargetForFragment(fragment, {
    parentSelector: commonAncestorSelector,
    position: "end",
  });
};

const findSelectionPasteTarget = (fragment: WebstudioFragment) =>
  findMultiSelectionInsertable(fragment) ??
  findPasteTargetForFragment(fragment);

const findPasteTargetForFragment = (
  fragment: WebstudioFragment,
  insertable?: Insertable
): undefined | Insertable => {
  const instances = $instances.get();

  insertable = findClosestInsertable(fragment, insertable, {
    allowContentModelWarnings: true,
  });
  if (insertable === undefined) {
    return;
  }
  return findSafeFragmentPasteTarget({
    fragment,
    instances,
    insertTarget: insertable,
  });
};

const findPasteTarget = (
  data: WebstudioFragment & { instanceSelector: string[] }
): undefined | Insertable => {
  const instances = $instances.get();

  const instanceSelector = $selectedInstanceSelector.get();
  const selectedSourceSelector =
    instanceSelector === undefined
      ? undefined
      : getExternalContentSourceSelector({
          selector: instanceSelector,
          roots: $externalContentRoots.get(),
        })?.sourceSelector;

  // paste after selected instance
  if (
    instanceSelector &&
    shallowEqual(
      selectedSourceSelector ?? instanceSelector,
      data.instanceSelector
    )
  ) {
    // body is not allowed to copy
    // so clipboard always have at least two level instance selector
    const [currentInstanceId, parentInstanceId] = instanceSelector;
    const parentInstance = instances.get(parentInstanceId);
    if (parentInstance === undefined) {
      return;
    }
    const indexWithinChildren = parentInstance.children.findIndex(
      (child) => child.type === "id" && child.value === currentInstanceId
    );
    return {
      parentSelector: instanceSelector.slice(1),
      position: indexWithinChildren + 1,
    };
  }

  return findSelectionPasteTarget(data);
};

const insertPastedFragment = async ({
  fragment,
  pasteTarget,
  selectRootInstances,
  sourceOrigin,
  assetPaths,
  projectId,
}: {
  fragment: WebstudioFragment;
  pasteTarget: Insertable;
  selectRootInstances: (rootInstanceIds: Instance["id"][]) => void;
  sourceOrigin: string | undefined;
  assetPaths?: Readonly<Record<string, string>>;
  projectId: string;
}) => {
  try {
    const contentModelWarnings = getFragmentContentModelWarnings({
      fragment,
      metas: $registeredComponentMetas.get(),
    });
    const conflictResolution = await resolveFragmentTokenConflicts(fragment);
    if (conflictResolution === "cancel") {
      return pasteHandled;
    }
    const transferred = await transferFragmentAssets({
      sourceOrigin,
      projectId,
      fragments: [fragment],
      importAssets: builderApi.importAssets,
    });
    if (transferred.success === false) {
      return transferred;
    }
    if ($project.get()?.id !== projectId) {
      return {
        success: false,
        error: "Project changed while pasting.",
      } as const;
    }
    if (sourceOrigin !== undefined) {
      try {
        const { skippedInvalidAssetIds } =
          await rewriteTransferredDocumentAssetReferences({
            sourceOrigin,
            projectId,
            sourceAssets: fragment.assets,
            sourceAssetPaths: assetPaths,
            importedAssets: transferred.assets,
          });
        if (skippedInvalidAssetIds.length > 0) {
          toast.warn(
            "Some invalid content files were copied unchanged. Open them to review their diagnostics."
          );
        }
      } catch {
        return {
          success: false,
          error:
            "Could not update Asset references in the copied content files.",
        } as const;
      }
    }
    if ($project.get()?.id !== projectId) {
      return {
        success: false,
        error: "Project changed while pasting.",
      } as const;
    }
    const transferredFragment = transferred.fragments.get(fragment);
    if (transferredFragment === undefined) {
      return pasteHandled;
    }
    const result = await executeRuntimeMutationAsync({
      id: "instances.insertFragment",
      input: {
        parentInstanceId: pasteTarget.parentSelector[0],
        fragment: transferredFragment,
        conflictResolution,
        insertIndex:
          typeof pasteTarget.position === "number"
            ? pasteTarget.position
            : undefined,
      },
      context: { allowLegacyContentModelWarnings: true },
    });
    const rootInstanceIds = result?.result.rootInstanceIds;
    if (rootInstanceIds === undefined || rootInstanceIds.length === 0) {
      return pasteHandled;
    }
    if (result?.result.didMergeBreakpointsDueToLimit === true) {
      toast.warn(breakpointPasteLimitWarning);
    }
    reportFragmentContentModelWarnings(contentModelWarnings);
    selectRootInstances(rootInstanceIds);
    return pasteHandled;
  } catch {
    return pasteHandled;
  }
};

const handlePasteInstance = async (clipboardData: string) => {
  const transferData = parseInstanceTransferData(clipboardData);
  if (transferData.owned === false) {
    return pasteIgnored;
  }
  if (transferData.valid === false) {
    return { success: false, error: invalidPasteDataMessage } as const;
  }
  const projectId = $project.get()?.id;
  if (projectId === undefined) {
    return pasteHandled;
  }
  if (transferData.type === "multi-root") {
    const pasteRootInstanceIds = getPasteRootInstanceIds(transferData.data);
    if (pasteRootInstanceIds.length === 0) {
      return pasteHandled;
    }
    const fragment: WebstudioFragment = {
      ...transferData.data.fragment,
      children: pasteRootInstanceIds.map((instanceId) => ({
        type: "id",
        value: instanceId,
      })),
    };
    const pasteTarget = findSelectionPasteTarget(fragment);
    if (pasteTarget === undefined) {
      return pasteHandled;
    }
    return insertPastedFragment({
      fragment,
      pasteTarget,
      sourceOrigin: transferData.data.sourceOrigin ?? window.location.origin,
      assetPaths: transferData.data.assetPaths,
      projectId,
      selectRootInstances: (rootInstanceIds) => {
        selectInstances(
          rootInstanceIds.map((newRootInstanceId) => [
            newRootInstanceId,
            ...pasteTarget.parentSelector,
          ])
        );
      },
    });
  }
  const fragment = transferData.data;

  const pasteTarget = findPasteTarget(fragment);
  if (pasteTarget === undefined) {
    return pasteHandled;
  }
  return insertPastedFragment({
    fragment,
    pasteTarget,
    sourceOrigin: transferData.data.sourceOrigin ?? window.location.origin,
    assetPaths: transferData.data.assetPaths,
    projectId,
    selectRootInstances: (rootInstanceIds) => {
      const newRootInstanceId = rootInstanceIds[0];
      if (newRootInstanceId === undefined) {
        return;
      }
      selectInstances([[newRootInstanceId, ...pasteTarget.parentSelector]]);
    },
  });
};

const handleCopyInstance = () => {
  const selectedInstanceSelectors = $allSelectedInstanceSelectors.get();
  if (selectedInstanceSelectors.length === 0) {
    return;
  }
  if (selectedInstanceSelectors.length === 1) {
    const data = getTreeData(selectedInstanceSelectors[0]);
    if (data === undefined) {
      return;
    }
    return stringify(data);
  }

  const selectedData = selectedInstanceSelectors
    .map((instanceSelector) =>
      getTreeData(instanceSelector, { showToast: false })
    )
    .filter((data): data is InstanceTransferData => data !== undefined);
  if (selectedData.length === 0) {
    return;
  }
  if (selectedData.length < selectedInstanceSelectors.length) {
    reportSkippedSelectedInstances("copied");
  }
  return stringifyMultiRootSelection(selectedData);
};

const handleCutInstance = () => {
  const selectedInstanceSelectors = $allSelectedInstanceSelectors.get();
  if (selectedInstanceSelectors.length > 1) {
    const instances = $instances.get();
    const selectedPaths = selectedInstanceSelectors
      .map((instanceSelector) => {
        const data = getTreeData(instanceSelector, { showToast: false });
        const instancePath =
          data === undefined
            ? undefined
            : getInstancePath(data.instanceSelector, instances);
        if (data === undefined || instancePath === undefined) {
          return;
        }
        return { data, instancePath };
      })
      .filter(
        (
          item
        ): item is {
          data: InstanceTransferData;
          instancePath: NonNullable<ReturnType<typeof getInstancePath>>;
        } => item !== undefined
      );
    if (selectedPaths.length === 0) {
      return;
    }
    const selectedPathData = selectedPaths.map(({ data }) => data);
    if (selectedPathData.length < selectedInstanceSelectors.length) {
      reportSkippedSelectedInstances("cut");
    }
    const clipboardData = stringifyMultiRootSelection(selectedPathData);
    for (const { instancePath } of sortInstancePathsForChildMutation(
      selectedPaths
    )) {
      deleteInstanceBySelector(instancePath[0].instanceSelector);
    }
    clearInstanceSelection();
    return clipboardData;
  }

  const instancePath = $selectedInstancePath.get();
  if (instancePath === undefined) {
    return;
  }
  // @todo tell user they can't delete root
  if (instancePath.length === 1) {
    return;
  }
  const data = getTreeData(instancePath[0].instanceSelector);
  if (data === undefined) {
    return;
  }
  deleteInstanceBySelector(instancePath[0].instanceSelector);
  if (data === undefined) {
    return;
  }
  return stringify(data);
};

export const instanceText = {
  name: "instance-text",
  mimeType: "text/plain",
  onCopy: handleCopyInstance,
  onCut: handleCutInstance,
  onPaste: handlePasteInstance,
} satisfies Plugin;

export const instanceJson = {
  name: "instance-json",
  mimeType: "application/json",
  onPaste: handlePasteInstance,
} satisfies Plugin;
