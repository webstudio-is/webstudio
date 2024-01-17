import { atom, computed, type WritableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import type { TabName } from "~/builder/features/sidebar-left/types";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";

const useValue = <T>(atom: WritableAtom<T>) => {
  const value = useStore(atom);
  return [value, atom.set] as const;
};

const $isShareDialogOpen = atom<boolean>(false);
export const useIsShareDialogOpen = () => useValue($isShareDialogOpen);

const $isPublishDialogOpen = atom<boolean>(false);
export const useIsPublishDialogOpen = () => useValue($isPublishDialogOpen);

export const $canvasWidth = atom<number | undefined>();
export const useCanvasWidth = () => useValue($canvasWidth);

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

// keep in sync with user-plan-features.server
export const $userPlanFeatures = atom<UserPlanFeatures>({
  allowShareAdminLinks: false,
  allowResourceVariables: false,
  maxDomainsAllowedPerUser: 5,
  hasSubscription: false,
  hasProPlan: false,
});
