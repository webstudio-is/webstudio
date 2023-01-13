import { atom, type WritableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import { type Breakpoint } from "@webstudio-is/css-data";
import {
  type SelectedInstanceData,
  type HoveredInstanceData,
} from "@webstudio-is/project";
import { type SyncStatus } from "~/shared/sync";
import { type Pages, type Project } from "@webstudio-is/project";
import type { AssetContainer, DeletingAssetContainer } from "../assets";

const useValue = <T>(atom: WritableAtom<T>) => {
  const value = useStore(atom);
  return [value, atom.set] as const;
};

const selectedInstanceDataContainer = atom<SelectedInstanceData | undefined>();
export const useSelectedInstanceData = () =>
  useValue(selectedInstanceDataContainer);

const hoveredInstanceDataContainer = atom<HoveredInstanceData | undefined>();
export const useHoveredInstanceData = () =>
  useValue(hoveredInstanceDataContainer);

const isShareDialogOpenContainer = atom<boolean>(false);
export const useIsShareDialogOpen = () => useValue(isShareDialogOpenContainer);

const isPublishDialogOpenContainer = atom<boolean>(false);
export const useIsPublishDialogOpen = () =>
  useValue(isPublishDialogOpenContainer);

const selectedBreakpointContainer = atom<Breakpoint | undefined>();
export const useSelectedBreakpoint = () =>
  useValue(selectedBreakpointContainer);

const zoomContainer = atom<number>(100);
export const useZoom = () => useValue(zoomContainer);

const canvasWidthContainer = atom<number>(0);
export const useCanvasWidth = () => useValue(canvasWidthContainer);

const canvasRectContainer = atom<DOMRect | undefined>();
export const useCanvasRect = () => useValue(canvasRectContainer);

const syncStatusContainer = atom<SyncStatus>("idle");
export const useSyncStatus = () => useValue(syncStatusContainer);

const assetsContainer = atom<Array<AssetContainer | DeletingAssetContainer>>(
  []
);
export const useAssetsContainer = () => useValue(assetsContainer);

const pagesContainer = atom<Pages | undefined>();
export const usePages = () => useValue(pagesContainer);

const currentPageIdContainer = atom<string | undefined>();
export const useCurrentPageId = () => useValue(currentPageIdContainer);

const projectContainer = atom<Project | undefined>();
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
