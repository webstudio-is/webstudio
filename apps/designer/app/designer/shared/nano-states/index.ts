import { createValueContainer, useValue } from "react-nano-state";
import { type Breakpoint } from "@webstudio-is/css-data";
import {
  type SelectedInstanceData,
  type HoveredInstanceData,
} from "@webstudio-is/project";
import { type SyncStatus } from "~/shared/sync";
import { type Pages, type Project } from "@webstudio-is/project";
import type { ClientAsset } from "../assets";

const selectedInstanceDataContainer = createValueContainer<
  SelectedInstanceData | undefined
>();
export const useSelectedInstanceData = () =>
  useValue(selectedInstanceDataContainer);

const hoveredInstanceDataContainer = createValueContainer<
  HoveredInstanceData | undefined
>();
export const useHoveredInstanceData = () =>
  useValue(hoveredInstanceDataContainer);

const isShareDialogOpenContainer = createValueContainer<boolean>(false);
export const useIsShareDialogOpen = () => useValue(isShareDialogOpenContainer);

const isPublishDialogOpenContainer = createValueContainer<boolean>(false);
export const useIsPublishDialogOpen = () =>
  useValue(isPublishDialogOpenContainer);

const selectedBreakpointContainer = createValueContainer<
  Breakpoint | undefined
>();
export const useSelectedBreakpoint = () =>
  useValue(selectedBreakpointContainer);

const zoomContainer = createValueContainer<number>(100);
export const useZoom = () => useValue(zoomContainer);

const canvasWidthContainer = createValueContainer<number>(0);
export const useCanvasWidth = () => useValue(canvasWidthContainer);

const canvasRectContainer = createValueContainer<DOMRect | undefined>();
export const useCanvasRect = () => useValue(canvasRectContainer);

const syncStatusContainer = createValueContainer<SyncStatus>("idle");
export const useSyncStatus = () => useValue(syncStatusContainer);

const clientAssetsContainer = createValueContainer<Array<ClientAsset>>([]);
export const useClientAssets = () => useValue(clientAssetsContainer);

const pagesContainer = createValueContainer<Pages | undefined>();
export const usePages = () => useValue(pagesContainer);

const currentPageIdContainer = createValueContainer<string | undefined>();
export const useCurrentPageId = () => useValue(currentPageIdContainer);

const projectContainer = createValueContainer<Project | undefined>();
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
const textToolbarState = createValueContainer<undefined | TextToolbarState>();
export const useTextToolbarState = () => useValue(textToolbarState);
