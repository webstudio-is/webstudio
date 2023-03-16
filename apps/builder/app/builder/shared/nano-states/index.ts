import { atom, type WritableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import type { Project } from "@webstudio-is/project";

const useValue = <T>(atom: WritableAtom<T>) => {
  const value = useStore(atom);
  return [value, atom.set] as const;
};

const isShareDialogOpenContainer = atom<boolean>(false);
export const useIsShareDialogOpen = () => useValue(isShareDialogOpenContainer);

const isPublishDialogOpenContainer = atom<boolean>(false);
export const useIsPublishDialogOpen = () =>
  useValue(isPublishDialogOpenContainer);

const canvasWidthContainer = atom<number>(0);
export const useCanvasWidth = () => useValue(canvasWidthContainer);

const canvasRectContainer = atom<DOMRect | undefined>();
export const useCanvasRect = () => useValue(canvasRectContainer);

export const projectContainer = atom<Project | undefined>();
export const useProject = () => useValue(projectContainer);

export type TextToolbarState = {
  selectionRect: DOMRect;
  isBold: boolean;
  isItalic: boolean;
  isSuperscript: boolean;
  isSubscript: boolean;
  isLink: boolean;
  isSpan: boolean;
};
const textToolbarState = atom<undefined | TextToolbarState>();
export const useTextToolbarState = () => useValue(textToolbarState);

export const isCanvasPointerEventsEnabledStore = atom<boolean>(true);
