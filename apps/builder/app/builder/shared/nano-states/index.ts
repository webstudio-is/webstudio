import { atom, computed } from "nanostores";
import {
  $isPreviewMode,
  $selectedInstanceRenderState,
} from "~/shared/nano-states/misc";
import { $canvasIframeState } from "~/shared/nano-states/canvas";
import { $settings, getSetting } from "../client-settings";

export const $isShareDialogOpen = atom<boolean>(false);

export const $publishDialog = atom<"none" | "publish" | "export">("none");

export const $canvasWidth = atom<number | undefined>();

export const $isCloneDialogOpen = atom<boolean>(false);

export const $canvasRect = atom<DOMRect | undefined>();

export const $workspaceRect = atom<DOMRect | undefined>();

export const $canvasScrollbarSize = atom<
  { width: number; height: number } | undefined
>();

export const $scale = computed(
  [$canvasWidth, $workspaceRect],
  (canvasWidth, workspaceRect) => {
    if (
      canvasWidth === undefined ||
      workspaceRect === undefined ||
      canvasWidth <= workspaceRect.width
    ) {
      return 100;
    }
    return Number.parseFloat(
      ((workspaceRect.width / canvasWidth) * 100).toFixed(2)
    );
  }
);

export const $clampingRect = computed(
  [$workspaceRect, $canvasRect, $canvasScrollbarSize, $scale],
  (workspaceRect, canvasRect, canvasScrollbarSize, scale) => {
    if (
      workspaceRect === undefined ||
      canvasRect === undefined ||
      canvasScrollbarSize === undefined
    ) {
      return;
    }

    const scrollbarWidthScaled = Math.round(
      (canvasScrollbarSize.width * scale) / 100
    );

    const scrollbarHeightScaled = Math.round(
      (canvasScrollbarSize.height * scale) / 100
    );

    if (canvasRect.width >= workspaceRect.width) {
      return {
        left: 0,
        top: 0,
        width: workspaceRect.width - scrollbarWidthScaled,
        height: workspaceRect.height - scrollbarHeightScaled,
      };
    }

    return {
      left: 0,
      top: 0,
      width: canvasRect.width - scrollbarWidthScaled,
      height: canvasRect.height - scrollbarHeightScaled,
    };
  }
);

export const $activeInspectorPanel = atom<"style" | "settings">("style");

export const $dataLoadingState = atom<"idle" | "loading" | "loaded">("idle");

export const $loadingState = computed(
  [$dataLoadingState, $selectedInstanceRenderState, $canvasIframeState],
  (dataLoadingState, selectedInstanceRenderState, canvasIframeState) => {
    const readyStates = new Map<
      "dataLoadingState" | "selectedInstanceRenderState" | "canvasIframeState",
      boolean
    >([
      ["dataLoadingState", dataLoadingState === "loaded"],
      [
        "selectedInstanceRenderState",
        selectedInstanceRenderState !== "pending",
      ],
      ["canvasIframeState", canvasIframeState === "ready"],
    ]);

    const readyCount = Array.from(readyStates.values()).filter(Boolean).length;
    const progress = Math.round((readyCount / readyStates.size) * 100);
    const state: "ready" | "loading" =
      readyCount === readyStates.size ? "ready" : "loading";

    return { state, progress, readyStates };
  }
);

export type SidebarPanelName =
  | "assets"
  | "components"
  | "navigator"
  | "pages"
  | "marketplace"
  | "none";

// Only used internally to avoid directly setting the value without using setActiveSidebarPanel.
const $activeSidebarPanel_ = atom<SidebarPanelName | undefined>();

export const $activeSidebarPanel = computed(
  [$activeSidebarPanel_, $isPreviewMode, $loadingState, $settings],
  (currentPanel, isPreviewMode, loadingState, { navigatorLayout }) => {
    if (loadingState.state !== "ready") {
      return "none";
    }
    if (isPreviewMode) {
      return currentPanel === "pages" ? "pages" : "none";
    }
    if (currentPanel === undefined) {
      return navigatorLayout === "undocked" ? "navigator" : "none";
    }
    return currentPanel;
  }
);

/**
 * auto shows default panel when sidepanel is undocked and hides when docked
 */
export const setActiveSidebarPanel = (nextPanel: "auto" | SidebarPanelName) => {
  const currentPanel = $activeSidebarPanel.get();
  // - When navigator is open, user is trying to close the navigator.
  // - Navigator is closed, user is trying to close some other panel, and if navigator is undocked, it needs to be opened.
  if (nextPanel === "none") {
    if (currentPanel === "navigator") {
      $activeSidebarPanel_.set("none");
      return;
    }
    if (getSetting("navigatorLayout") === "undocked") {
      $activeSidebarPanel_.set("navigator");
      return;
    }
  }
  $activeSidebarPanel_.set(nextPanel === "auto" ? undefined : nextPanel);
};

export const toggleActiveSidebarPanel = (panel: SidebarPanelName) => {
  const currentPanel = $activeSidebarPanel.get();
  setActiveSidebarPanel(panel === currentPanel ? "none" : panel);
};
