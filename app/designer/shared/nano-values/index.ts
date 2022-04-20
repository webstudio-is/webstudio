import { createValueContainer, useValue } from "react-nano-state";
import {
  type Breakpoint,
  type Instance,
  defaultBreakpoint,
} from "@webstudio-is/sdk";
import { SelectedInstanceData } from "~/shared/component";
import { type SyncStatus } from "~/shared/sync";

const rootInstanceContainer = createValueContainer<Instance | undefined>();
export const useRootInstance = () => useValue(rootInstanceContainer);

const selectedInstanceDataContainer = createValueContainer<
  SelectedInstanceData | undefined
>();
export const useSelectedInstanceData = () =>
  useValue(selectedInstanceDataContainer);

const isPreviewModeContainer = createValueContainer<boolean>(false);
export const useIsPreviewMode = () => useValue(isPreviewModeContainer);

const isShareDialogOpenContainer = createValueContainer<boolean>(false);
export const useIsShareDialogOpen = () => useValue(isShareDialogOpenContainer);

const isPublishDialogOpenContainer = createValueContainer<boolean>(false);
export const useIsPublishDialogOpen = () =>
  useValue(isPublishDialogOpenContainer);

export const selectedBreakpointContainer =
  createValueContainer<Breakpoint>(defaultBreakpoint);
export const useSelectedBreakpoint = () =>
  useValue(selectedBreakpointContainer);

export const breakpointsContainer = createValueContainer<Array<Breakpoint>>([
  defaultBreakpoint,
]);
export const useBreakpoints = () => useValue(breakpointsContainer);

const syncStatusContainer = createValueContainer<SyncStatus>("idle");
export const useSyncStatus = () => useValue(syncStatusContainer);
