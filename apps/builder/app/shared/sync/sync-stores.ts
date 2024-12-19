import { Store } from "immerhin";
import { enableMapSet, setAutoFreeze } from "immer";
import { useEffect } from "react";
import {
  $project,
  $pages,
  $instances,
  $props,
  $dataSources,
  $breakpoints,
  $styles,
  $styleSources,
  $styleSourceSelections,
  $assets,
  $selectedPageHash,
  $selectedInstanceSelector,
  $selectedInstanceBrowserStyle,
  $selectedInstanceUnitSizes,
  $selectedInstanceIntanceToTag,
  $selectedInstanceRenderState,
  $hoveredInstanceSelector,
  $authTokenPermissions,
  $toastErrors,
  $selectedStyleSources,
  $selectedStyleState,
  $dataSourceVariables,
  $dragAndDropState,
  $selectedInstanceStates,
  $resources,
  $resourceValues,
  $marketplaceProduct,
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
  $hoveredInstanceOutline,
  $selectedInstanceOutline,
  $blockChildOutline,
  $textToolbar,
  $registeredComponentMetas,
  $registeredComponentPropsMetas,
  $modifierKeys,
} from "~/shared/nano-states";
import { $ephemeralStyles } from "~/canvas/stores";
import { $awareness, $temporaryInstances } from "../awareness";
import {
  ImmerhinSyncObject,
  NanostoresSyncObject,
  SyncClient,
  SyncObjectPool,
  type SyncEmitter,
} from "../sync-client";
import { $canvasScrollbarSize } from "~/builder/shared/nano-states";

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

export const createObjectPool = () => {
  return new SyncObjectPool([
    new ImmerhinSyncObject("server", serverSyncStore),
    new ImmerhinSyncObject("client", clientSyncStore),
    new NanostoresSyncObject(
      "selectedInstanceSelector",
      $selectedInstanceSelector
    ),
    new NanostoresSyncObject("awareness", $awareness),
    new NanostoresSyncObject("temporaryInstances", $temporaryInstances),

    new NanostoresSyncObject("project", $project),
    new NanostoresSyncObject("dataSourceVariables", $dataSourceVariables),
    new NanostoresSyncObject("resourceValues", $resourceValues),
    new NanostoresSyncObject("selectedPageHash", $selectedPageHash),
    new NanostoresSyncObject(
      "selectedInstanceBrowserStyle",
      $selectedInstanceBrowserStyle
    ),
    new NanostoresSyncObject(
      "selectedInstanceIntanceToTag",
      $selectedInstanceIntanceToTag
    ),
    new NanostoresSyncObject(
      "selectedInstanceUnitSizes",
      $selectedInstanceUnitSizes
    ),
    new NanostoresSyncObject(
      "selectedInstanceRenderState",
      $selectedInstanceRenderState
    ),
    new NanostoresSyncObject(
      "hoveredInstanceSelector",
      $hoveredInstanceSelector
    ),
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
    new NanostoresSyncObject(
      "selectedInstanceOutline",
      $selectedInstanceOutline
    ),
    new NanostoresSyncObject("hoveredInstanceOutline", $hoveredInstanceOutline),
    new NanostoresSyncObject("blockChildOutline", $blockChildOutline),
    new NanostoresSyncObject("modifierKeys", $modifierKeys),
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
    new NanostoresSyncObject(
      "registeredComponentPropsMetas",
      $registeredComponentPropsMetas
    ),
    new NanostoresSyncObject("canvasScrollbarWidth", $canvasScrollbarSize),
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
