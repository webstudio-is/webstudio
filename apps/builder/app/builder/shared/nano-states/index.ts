import { atom, computed, type WritableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import type { Project } from "@webstudio-is/project";

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

export const canvasRectStore = atom<DOMRect | undefined>();

export const projectContainer = atom<Project | undefined>();
export const useProject = () => useValue(projectContainer);

export const isCanvasPointerEventsEnabledStore = atom<boolean>(true);

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
