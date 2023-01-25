import { atom, computed, type WritableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import { Instance, PresetStyles, Styles } from "@webstudio-is/react-sdk";
import type {
  DropTargetChangePayload,
  DragStartPayload,
} from "~/canvas/shared/use-drag-drop";
import type { Breakpoint, Style } from "@webstudio-is/css-data";
import type { DesignToken } from "@webstudio-is/design-tokens";
import { useSyncInitializeOnce } from "../hook-utils";

const useValue = <T>(atom: WritableAtom<T>) => {
  const value = useStore(atom);
  return [value, atom.set] as const;
};

export const rootInstanceContainer = atom<Instance | undefined>();
export const useRootInstance = () => useValue(rootInstanceContainer);
export const useSetRootInstance = (root: Instance) => {
  useSyncInitializeOnce(() => {
    rootInstanceContainer.set(root);
  });
};
export const instancesIndexStore = computed(
  rootInstanceContainer,
  (rootInstance) => {
    const instancesById = new Map<Instance["id"], Instance>();
    const traverseInstances = (instance: Instance) => {
      instancesById.set(instance.id, instance);
      for (const child of instance.children) {
        if (child.type === "instance") {
          traverseInstances(child);
        }
      }
    };
    if (rootInstance !== undefined) {
      traverseInstances(rootInstance);
    }
    return {
      instancesById,
    };
  }
);

export const presetStylesContainer = atom<PresetStyles>([]);
export const usePresetStyles = () => useValue(presetStylesContainer);
export const useSetPresetStyles = (presetStyles: PresetStyles) => {
  useSyncInitializeOnce(() => {
    presetStylesContainer.set(presetStyles);
  });
};

export const stylesContainer = atom<Styles>([]);
/**
 * Indexed styles data is recomputed on every styles update
 * Compumer should use shallow-equal to check all items in the list
 * are the same to avoid unnecessary rerenders
 *
 * Potential optimization can be maintaining the index as separate state
 * though will require to move away from running immer patches on array
 * of styles
 */
export const stylesIndexStore = computed(stylesContainer, (styles) => {
  const stylesByInstanceId = new Map<Instance["id"], Styles>();
  for (const stylesItem of styles) {
    const { instanceId } = stylesItem;
    let instanceStyles = stylesByInstanceId.get(instanceId);
    if (instanceStyles === undefined) {
      instanceStyles = [];
      stylesByInstanceId.set(instanceId, instanceStyles);
    }
    instanceStyles.push(stylesItem);
  }
  return {
    stylesByInstanceId,
  };
});

export const useStyles = () => useValue(stylesContainer);
export const useSetStyles = (styles: Styles) => {
  useSyncInitializeOnce(() => {
    stylesContainer.set(styles);
  });
};

export const breakpointsContainer = atom<Breakpoint[]>([]);
export const useBreakpoints = () => useValue(breakpointsContainer);
export const useSetBreakpoints = (breakpoints: Breakpoint[]) => {
  useSyncInitializeOnce(() => {
    breakpointsContainer.set(breakpoints);
  });
};

export const designTokensContainer = atom<DesignToken[]>([]);
export const useDesignTokens = () => useValue(designTokensContainer);
export const useSetDesignTokens = (designTokens: DesignToken[]) => {
  useSyncInitializeOnce(() => {
    designTokensContainer.set(designTokens);
  });
};

export const selectedInstanceIdStore = atom<undefined | Instance["id"]>(
  undefined
);
export const selectedInstanceStore = computed(
  [instancesIndexStore, selectedInstanceIdStore],
  (instancesIndex, selectedInstanceId) => {
    if (selectedInstanceId === undefined) {
      return;
    }
    return instancesIndex.instancesById.get(selectedInstanceId);
  }
);
export const selectedInstanceBrowserStyleStore = atom<undefined | Style>();

const isPreviewModeContainer = atom<boolean>(false);
export const useIsPreviewMode = () => useValue(isPreviewModeContainer);

const selectedInstanceOutlineContainer = atom<{
  visible: boolean;
  rect?: DOMRect;
}>({
  visible: false,
  rect: undefined,
});
export const useSelectedInstanceOutline = () =>
  useValue(selectedInstanceOutlineContainer);

const hoveredInstanceRectContainer = atom<DOMRect | undefined>();
export const useHoveredInstanceRect = () =>
  useValue(hoveredInstanceRectContainer);

const isScrollingContainer = atom<boolean>(false);
export const useIsScrolling = () => useValue(isScrollingContainer);

// We are editing the text of that instance in text editor.
const textEditingInstanceIdContainer = atom<Instance["id"] | undefined>();
export const useTextEditingInstanceId = () =>
  useValue(textEditingInstanceIdContainer);

export type DragAndDropState = {
  isDragging: boolean;
  origin?: "canvas" | "panel";
  dropTarget?: DropTargetChangePayload;
  dragItem?: DragStartPayload["dragItem"];
};
const dragAndDropStateContainer = atom<DragAndDropState>({
  isDragging: false,
});
export const useDragAndDropState = () => useValue(dragAndDropStateContainer);
