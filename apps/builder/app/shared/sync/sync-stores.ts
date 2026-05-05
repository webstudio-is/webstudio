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
  $hoveredInstanceOutline,
} from "~/shared/nano-states";
import { $marketplaceProduct } from "~/shared/sync/data-stores";
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
import { $selectedInstanceSelector } from "../nano-states/instances";
import { $selectedPageId } from "../nano-states/pages";
import { $systemDataByPage } from "../system";
import { $resourcesCache } from "../resources";
import type { InstanceSelector } from "../tree-utils";

enableMapSet();
// safari structuredClone fix
setAutoFreeze(false);

export const clientSyncStore = new Store();
export const serverSyncStore = new Store();

export const registerContainers = () => {
  // synchronize patches
  serverSyncStore.register("pages", $pages);
  serverSyncStore.register("breakpoints", $breakpoints);
  serverSyncStore.register("instances", $instances);
  serverSyncStore.register("styles", $styles);
  serverSyncStore.register("styleSources", $styleSources);
  serverSyncStore.register("styleSourceSelections", $styleSourceSelections);
  serverSyncStore.register("props", $props);
  serverSyncStore.register("dataSources", $dataSources);
  serverSyncStore.register("resources", $resources);
  serverSyncStore.register("assets", $assets);
  serverSyncStore.register("marketplaceProduct", $marketplaceProduct);
};

type SelectedPageAndInstance = {
  selectedPageId: string | undefined;
  selectedInstanceSelector: InstanceSelector | undefined;
};

const $selectedPageAndInstance = batched(
  [$selectedPageId, $selectedInstanceSelector],
  (selectedPageId, selectedInstanceSelector): SelectedPageAndInstance => ({
    selectedPageId,
    selectedInstanceSelector,
  })
);

class SelectedPageAndInstanceSyncObject {
  name = "selectedPageAndInstance";
  operation: "local" | "state" | "add" = "local";
  ignoreNextBatchedChange = false;

  getState() {
    return $selectedPageAndInstance.get();
  }

  setState(state: unknown) {
    this.operation = "state";
    this.ignoreNextBatchedChange = this.setSelectedPageAndInstance(state);
    this.operation = "local";
  }

  applyTransaction(transaction: Transaction) {
    this.operation = "add";
    try {
      this.ignoreNextBatchedChange = this.setSelectedPageAndInstance(
        structuredClone(transaction.payload)
      );
    } catch (error) {
      console.error(error);
    }
    this.operation = "local";
  }

  revertTransaction(_transaction: RevertedTransaction) {
    // @todo store the list of transactions
  }

  subscribe(
    sendTransaction: (transaction: Transaction) => void,
    signal: AbortSignal
  ) {
    const unsubscribe = $selectedPageAndInstance.listen((payload) => {
      if (this.ignoreNextBatchedChange) {
        this.ignoreNextBatchedChange = false;
        return;
      }
      if (this.operation !== "local") {
        return;
      }
      sendTransaction({ id: nanoid(), object: this.name, payload });
    });
    signal.addEventListener("abort", unsubscribe);
  }

  private setSelectedPageAndInstance(state: unknown) {
    if (typeof state !== "object" || state === null) {
      return false;
    }
    const { selectedPageId, selectedInstanceSelector } =
      state as Partial<SelectedPageAndInstance>;
    if (selectedPageId !== undefined && typeof selectedPageId !== "string") {
      return false;
    }
    if (
      selectedInstanceSelector !== undefined &&
      (Array.isArray(selectedInstanceSelector) === false ||
        selectedInstanceSelector.every((id) => typeof id === "string") ===
          false)
    ) {
      return false;
    }
    $selectedPageId.set(selectedPageId);
    $selectedInstanceSelector.set(selectedInstanceSelector);
    return true;
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
