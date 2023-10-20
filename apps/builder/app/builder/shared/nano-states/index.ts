import { atom, computed, type WritableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import type { TabName } from "~/builder/features/sidebar-left/types";

const useValue = <T>(atom: WritableAtom<T>) => {
  const value = useStore(atom);
  return [value, atom.set] as const;
};

const isShareDialogOpenStore = atom<boolean>(false);
export const useIsShareDialogOpen = () => useValue(isShareDialogOpenStore);

const isPublishDialogOpenStore = atom<boolean>(false);
export const useIsPublishDialogOpen = () => useValue(isPublishDialogOpenStore);

export const canvasWidthStore = atom<number | undefined>();
export const useCanvasWidth = () => useValue(canvasWidthStore);

export const $canvasRect = atom<DOMRect | undefined>();

export const workspaceRectStore = atom<DOMRect | undefined>();

export const scaleStore = computed(
  [canvasWidthStore, workspaceRectStore],
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
