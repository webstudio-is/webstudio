import { atom, computed } from "nanostores";
import type { TabName } from "~/builder/features/sidebar-left/types";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import {
  $isPreviewMode,
  $selectedInstanceRenderState,
} from "~/shared/nano-states/misc";
import { $canvasIframeState } from "~/shared/nano-states/canvas";

export const $isShareDialogOpen = atom<boolean>(false);

export const $isPublishDialogOpen = atom<boolean>(false);

export const $canvasWidth = atom<number | undefined>();

export const $isCloneDialogOpen = atom<boolean>(false);

export const $canvasRect = atom<DOMRect | undefined>();

export const $workspaceRect = atom<DOMRect | undefined>();

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

export const $activeSidebarPanel = atom<TabName>("none");

export const $activeInspectorPanel = atom<"style" | "settings">("style");

// keep in sync with user-plan-features.server
export const $userPlanFeatures = atom<UserPlanFeatures>({
  allowShareAdminLinks: false,
  allowDynamicData: false,
  allowContactEmail: false,
  maxDomainsAllowedPerUser: 5,
  hasSubscription: false,
  hasProPlan: false,
});

export const $dataLoadingState = atom<"idle" | "loading" | "loaded">("idle");

export const $loadingState = computed(
  [
    $dataLoadingState,
    $selectedInstanceRenderState,
    $canvasIframeState,
    $isPreviewMode,
  ],
  (
    dataLoadingState,
    selectedInstanceRenderState,
    canvasIframeState,
    isPreviewMode
  ) => {
    const readyStates = new Map<
      "dataLoadingState" | "selectedInstanceRenderState" | "canvasIframeState",
      boolean
    >([
      ["dataLoadingState", dataLoadingState === "loaded"],
      [
        "selectedInstanceRenderState",
        selectedInstanceRenderState === "mounted" || isPreviewMode,
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
