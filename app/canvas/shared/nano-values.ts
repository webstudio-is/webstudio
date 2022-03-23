import { createValueContainer, useValue } from "react-nano-state";
import { type Instance } from "@webstudio-is/sdk";
import { type DragData } from "~/shared/component";

const dragDataContainer = createValueContainer<DragData | undefined>();
export const useDragData = () => useValue(dragDataContainer);

const selectedInstanceContainer = createValueContainer<Instance | undefined>();
export const useSelectedInstance = () => useValue(selectedInstanceContainer);

const selectedElementContainer = createValueContainer<Element | undefined>();
export const useSelectedElement = () => useValue(selectedElementContainer);

const isPreviewModeContainer = createValueContainer<boolean>(false);
export const useIsPreviewMode = () => useValue(isPreviewModeContainer);
