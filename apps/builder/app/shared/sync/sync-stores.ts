import { Store } from "immerhin";
import { enableMapSet, setAutoFreeze } from "immer";
import { useEffect } from "react";
import { batched } from "nanostores";
import { nanoid } from "nanoid";
import { $project } from "./data-stores";
import {
  $selectedPageHash,
  $selectedInstanceSizes,
  $authTokenPermissions,
  $toastErrors,
  $selectedStyleSources,
  $selectedStyleState,
  $dataSourceVariables,
  $dragAndDropState,
  $selectedInstanceStates,
  $canvasIframeState,
  $uploadingFilesDataStore,
  $memoryProps,
  $detectedFontsWeights,
  $builderMode,
  $selectedBreakpointId,
  $textEditingInstanceSelector,
  $textEditorContextMenu,
  $textEditorContextMenuCommand,
  $isResizingCanvas,
  $collaborativeInstanceRect,
  $collaborativeInstanceSelector,
  $blockChildOutline,
  $textToolbar,
  $gridCellData,
  $registeredComponentMetas,
  $registeredTemplates,
  $modifierKeys,
  $instanceContextMenu,
  $selectedInstanceRenderState,
  $hoveredInstanceSelector,
  $selectedInstanceOutline,
  $selectedInstanceOutlines,
  $hoveredInstanceOutline,
} from "~/shared/nano-states";
import {
  $marketplaceProduct,
  $projectSettings,
} from "~/shared/sync/data-stores";
import { $ephemeralStyles } from "~/canvas/stores";
import {
  ImmerhinSyncObject,
  NanostoresSyncObject,
  SyncClient,
  SyncObjectPool,
} from "../sync-client";
import type {
  RevertedTransaction,
  SyncEmitter,
  Transaction,
} from "@webstudio-is/sync-client";
import { $canvasScrollbarSize } from "~/builder/shared/nano-states";
import {
  $pages,
  $instances,
  $props,
  $dataSources,
  $breakpoints,
  $styles,
  $styleSources,
  $styleSourceSelections,
  $assets,
  $resources,
} from "~/shared/sync/data-stores";
import { $pointerPosition } from "../awareness";
import { $temporaryInstances } from "../nano-states";
import {
  $allSelectedInstanceSelectors,
  $instanceSelectionUpdate,
  $selectedInstanceSelector,
  selectInstance,
  selectInstances,
} from "../nano-states/instance-selection";
import { $selectedPageId } from "../nano-states/pages";
import { areSelectorListsEqual } from "../instance-utils/selection";
import { $systemDataByPage } from "../system";
import { $resourcesCache } from "../resources";
import {
  areInstanceSelectorsEqual,
  type InstanceSelector,
} from "@webstudio-is/project-build/runtime";

enableMapSet();
// safari structuredClone fix
setAutoFreeze(false);

export const clientSyncStore = new Store();
export const serverSyncStore = new Store();

const serverSyncStores = {
  pages: $pages,
  breakpoints: $breakpoints,
  instances: $instances,
  styles: $styles,
  styleSources: $styleSources,
  styleSourceSelections: $styleSourceSelections,
  props: $props,
  dataSources: $dataSources,
  resources: $resources,
  assets: $assets,
  projectSettings: $projectSettings,
  marketplaceProduct: $marketplaceProduct,
} as const;

type ServerSyncStoreName = keyof typeof serverSyncStores;
type ServerSyncStoreValue = {
  [Name in ServerSyncStoreName]: ReturnType<
    (typeof serverSyncStores)[Name]["get"]
  >;
}[ServerSyncStoreName];
export type ServerSyncState = Map<ServerSyncStoreName, ServerSyncStoreValue>;

export const serverSyncStoreNames = Object.keys(
  serverSyncStores
) as ReadonlyArray<ServerSyncStoreName>;

export const registerContainers = () => {
  // synchronize patches
  for (const name of serverSyncStoreNames) {
    serverSyncStore.register<ServerSyncStoreValue>(
      name,
      serverSyncStores[name]
    );
  }
};

type SelectedPageAndInstance = {
  selectedPageId: string | undefined;
  selectedInstanceSelector: InstanceSelector | undefined;
  allSelectedInstanceSelectors: InstanceSelector[];
};

const isInstanceSelector = (value: unknown): value is InstanceSelector =>
  Array.isArray(value) && value.every((id) => typeof id === "string");

const isInstanceSelectorList = (value: unknown): value is InstanceSelector[] =>
  Array.isArray(value) && value.every(isInstanceSelector);

const areSelectedPageAndInstanceEqual = (
  left: SelectedPageAndInstance,
  right: SelectedPageAndInstance
) =>
  left.selectedPageId === right.selectedPageId &&
  (left.selectedInstanceSelector === undefined
    ? right.selectedInstanceSelector === undefined
    : right.selectedInstanceSelector !== undefined &&
      areInstanceSelectorsEqual(
        left.selectedInstanceSelector,
        right.selectedInstanceSelector
      )) &&
  areSelectorListsEqual(
    left.allSelectedInstanceSelectors,
    right.allSelectedInstanceSelectors
  );

const $selectedPageAndInstance = batched(
  [
    $selectedPageId,
    $selectedInstanceSelector,
    $allSelectedInstanceSelectors,
    $instanceSelectionUpdate,
  ],
  (
    selectedPageId,
    selectedInstanceSelector,
    allSelectedInstanceSelectors,
    selectionUpdate
  ) => ({
    state: {
      selectedPageId,
      selectedInstanceSelector,
      allSelectedInstanceSelectors,
    } satisfies SelectedPageAndInstance,
    selectionUpdate,
  })
);

class SelectedPageAndInstanceSyncObject {
  name = "selectedPageAndInstance";
  private operation: "local" | "state" | "add" = "local";
  private stateToIgnore: SelectedPageAndInstance | undefined;
  private lastSelectionRevision = $instanceSelectionUpdate.get().revision;
  private lastSelectedPageId = $selectedPageId.get();

  getState() {
    return $selectedPageAndInstance.get().state;
  }

  setState(state: unknown) {
    this.applyRemoteState(state, "state");
  }

  applyTransaction(transaction: Transaction) {
    this.applyRemoteState(transaction.payload, "add");
  }

  revertTransaction(_transaction: RevertedTransaction) {
    // @todo store the list of transactions
  }

  subscribe(
    sendTransaction: (transaction: Transaction) => void,
    signal: AbortSignal
  ) {
    this.lastSelectionRevision = $instanceSelectionUpdate.get().revision;
    this.lastSelectedPageId = $selectedPageId.get();
    const unsubscribe = $selectedPageAndInstance.listen(
      ({ state, selectionUpdate }) => {
        const isDerivedPruning =
          selectionUpdate.revision !== this.lastSelectionRevision &&
          selectionUpdate.origin === "instance-pruning";
        const didSelectedPageChange =
          state.selectedPageId !== this.lastSelectedPageId;
        this.lastSelectionRevision = selectionUpdate.revision;
        this.lastSelectedPageId = state.selectedPageId;
        if (this.stateToIgnore !== undefined) {
          const shouldIgnore = areSelectedPageAndInstanceEqual(
            state,
            this.stateToIgnore
          );
          this.stateToIgnore = undefined;
          if (shouldIgnore) {
            return;
          }
        }
        if (
          this.operation !== "local" ||
          (isDerivedPruning && didSelectedPageChange === false)
        ) {
          return;
        }
        sendTransaction({ id: nanoid(), object: this.name, payload: state });
      }
    );
    signal.addEventListener("abort", unsubscribe);
  }

  private applyRemoteState(state: unknown, operation: "state" | "add") {
    this.operation = operation;
    try {
      const appliedState = this.setSelectedPageAndInstance(
        operation === "add" ? structuredClone(state) : state
      );
      if (appliedState !== undefined) {
        this.stateToIgnore = appliedState;
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.operation = "local";
    }
  }

  private setSelectedPageAndInstance(
    state: unknown
  ): SelectedPageAndInstance | undefined {
    if (typeof state !== "object" || state === null) {
      return;
    }
    const {
      selectedPageId,
      selectedInstanceSelector,
      allSelectedInstanceSelectors,
    } = state as Partial<SelectedPageAndInstance>;
    if (selectedPageId !== undefined && typeof selectedPageId !== "string") {
      return;
    }
    if (
      selectedInstanceSelector !== undefined &&
      isInstanceSelector(selectedInstanceSelector) === false
    ) {
      return;
    }
    if (
      allSelectedInstanceSelectors !== undefined &&
      isInstanceSelectorList(allSelectedInstanceSelectors) === false
    ) {
      return;
    }
    $selectedPageId.set(selectedPageId);
    if (allSelectedInstanceSelectors !== undefined) {
      selectInstances(allSelectedInstanceSelectors);
    } else {
      selectInstance(selectedInstanceSelector);
    }
    return {
      selectedPageId: $selectedPageId.get(),
      selectedInstanceSelector: $selectedInstanceSelector.get(),
      allSelectedInstanceSelectors: $allSelectedInstanceSelectors.get(),
    };
  }
}

export const __testing__ = {
  SelectedPageAndInstanceSyncObject,
};

export const createObjectPool = () => {
  return new SyncObjectPool([
    new ImmerhinSyncObject("server", serverSyncStore),
    new ImmerhinSyncObject("client", clientSyncStore),
    new SelectedPageAndInstanceSyncObject(),
    new NanostoresSyncObject("pointerPosition", $pointerPosition),
    new NanostoresSyncObject("temporaryInstances", $temporaryInstances),

    new NanostoresSyncObject("project", $project),
    new NanostoresSyncObject("dataSourceVariables", $dataSourceVariables),
    new NanostoresSyncObject("resourcesCache", $resourcesCache),
    new NanostoresSyncObject("selectedPageHash", $selectedPageHash),
    new NanostoresSyncObject("selectedInstanceSizes", $selectedInstanceSizes),
    new NanostoresSyncObject(
      "selectedInstanceRenderState",
      $selectedInstanceRenderState
    ),
    new NanostoresSyncObject(
      "hoveredInstanceSelector",
      $hoveredInstanceSelector
    ),
    new NanostoresSyncObject(
      "selectedInstanceOutline",
      $selectedInstanceOutline
    ),
    new NanostoresSyncObject(
      "selectedInstanceOutlines",
      $selectedInstanceOutlines
    ),
    new NanostoresSyncObject("hoveredInstanceOutline", $hoveredInstanceOutline),
    new NanostoresSyncObject("builderMode", $builderMode),
    new NanostoresSyncObject("authTokenPermissions", $authTokenPermissions),
    new NanostoresSyncObject("toastErrors", $toastErrors),
    new NanostoresSyncObject("selectedStyleSources", $selectedStyleSources),
    new NanostoresSyncObject("selectedStyleState", $selectedStyleState),
    new NanostoresSyncObject("dragAndDropState", $dragAndDropState),
    new NanostoresSyncObject("ephemeralStyles", $ephemeralStyles),
    new NanostoresSyncObject("selectedInstanceStates", $selectedInstanceStates),
    new NanostoresSyncObject("canvasIframeState", $canvasIframeState),
    new NanostoresSyncObject(
      "uploadingFilesDataStore",
      $uploadingFilesDataStore
    ),
    new NanostoresSyncObject("memoryProps", $memoryProps),
    new NanostoresSyncObject("detectedFontsWeights", $detectedFontsWeights),
    new NanostoresSyncObject("selectedBreakpointId", $selectedBreakpointId),
    new NanostoresSyncObject(
      "textEditingInstanceSelector",
      $textEditingInstanceSelector
    ),
    new NanostoresSyncObject("textEditorContextMenu", $textEditorContextMenu),
    new NanostoresSyncObject(
      "textEditorContextMenuCommand",
      $textEditorContextMenuCommand
    ),
    new NanostoresSyncObject("isResizingCanvas", $isResizingCanvas),
    new NanostoresSyncObject("textToolbar", $textToolbar),
    new NanostoresSyncObject("blockChildOutline", $blockChildOutline),
    new NanostoresSyncObject("instanceContextMenu", $instanceContextMenu),
    new NanostoresSyncObject("modifierKeys", $modifierKeys),
    new NanostoresSyncObject("gridCellData", $gridCellData),
    new NanostoresSyncObject(
      "collaborativeInstanceSelector",
      $collaborativeInstanceSelector
    ),
    new NanostoresSyncObject(
      "collaborativeInstanceRect",
      $collaborativeInstanceRect
    ),
    new NanostoresSyncObject(
      "registeredComponentMetas",
      $registeredComponentMetas
    ),
    new NanostoresSyncObject("registeredTemplates", $registeredTemplates),
    new NanostoresSyncObject("canvasScrollbarWidth", $canvasScrollbarSize),
    new NanostoresSyncObject("systemDataByPage", $systemDataByPage),
  ]);
};

declare global {
  interface Window {
    __webstudioSharedSyncEmitter__: SyncEmitter | undefined;
  }
}

/**
 * prevent syncEmitter interception from embedded scripts on canvas
 * i.e., `globalThis.syncEmitter = () => console.log('INTERCEPTED');`,
 */
const sharedSyncEmitter =
  typeof window === "undefined"
    ? undefined
    : window.__webstudioSharedSyncEmitter__;
if (typeof window !== "undefined") {
  delete window.__webstudioSharedSyncEmitter__;
}

export const useCanvasStore = () => {
  useEffect(() => {
    const canvasClient = new SyncClient({
      role: "follower",
      object: createObjectPool(),
      emitter: sharedSyncEmitter,
    });

    const controller = new AbortController();
    canvasClient.connect({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, []);
};
