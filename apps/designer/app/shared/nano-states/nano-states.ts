import { createValueContainer, useValue } from "react-nano-state";
import { type Breakpoint, type Instance } from "@webstudio-is/react-sdk";
import { DropTargetSharedData } from "~/canvas/shared/use-drag-drop";

export const rootInstanceContainer = createValueContainer<
  Instance | undefined
>();
export const useRootInstance = () => useValue(rootInstanceContainer);

export const breakpointsContainer = createValueContainer<Array<Breakpoint>>([]);
export const useBreakpoints = () => useValue(breakpointsContainer);

const isPreviewModeContainer = createValueContainer<boolean>(false);
export const useIsPreviewMode = () => useValue(isPreviewModeContainer);

const selectedInstanceRectContainer = createValueContainer<
  DOMRect | undefined
>();
export const useSelectedInstanceRect = () =>
  useValue(selectedInstanceRectContainer);

const hoveredInstanceRectContainer = createValueContainer<
  DOMRect | undefined
>();
export const useHoveredInstanceRect = () =>
  useValue(hoveredInstanceRectContainer);

const isScrollingContainer = createValueContainer<boolean>(false);
export const useIsScrolling = () => useValue(isScrollingContainer);

// We are editing the text of that instance in text editor.
const textEditingInstanceIdContainer = createValueContainer<
  Instance["id"] | undefined
>();
export const useTextEditingInstanceId = () =>
  useValue(textEditingInstanceIdContainer);

export type DragAndDropState =
  | { isDragging: false }
  | {
      isDragging: true;
      dropTarget?: DropTargetSharedData;
      dragItem: { instanceId: Instance["id"] };
    };
const dragAndDropStateContainer = createValueContainer<DragAndDropState>({
  isDragging: false,
});
export const useDragAndDropState = () => useValue(dragAndDropStateContainer);
