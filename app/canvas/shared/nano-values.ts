import { createValueContainer, useValue } from "react-nano-state";
import { type Breakpoint, type Instance } from "@webstudio-is/sdk";
import { type DropData } from "~/shared/component";
import store from "immerhin";

const dropDataContainer = createValueContainer<DropData | undefined>();
export const useDropData = () => useValue(dropDataContainer);

export const selectedInstanceContainer = createValueContainer<
  Instance | undefined
>();
export const useSelectedInstance = () => useValue(selectedInstanceContainer);

const selectedElementContainer = createValueContainer<Element | undefined>();
export const useSelectedElement = () => useValue(selectedElementContainer);

const isPreviewModeContainer = createValueContainer<boolean>(false);
export const useIsPreviewMode = () => useValue(isPreviewModeContainer);

export const rootInstanceContainer = createValueContainer<
  Instance | undefined
>();
export const useRootInstance = () => useValue(rootInstanceContainer);
store.register("root", rootInstanceContainer);

export const breakpointsContainer = createValueContainer<Array<Breakpoint>>([]);
export const useBreakpoints = () => useValue(breakpointsContainer);
