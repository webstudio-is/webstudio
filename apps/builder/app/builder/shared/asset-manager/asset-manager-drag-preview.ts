import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
  getAssetManagerSelectionKey,
  type AssetManagerSelection,
} from "./asset-manager-selection";

const previewItemLimit = 4;
const previewItemOffset = 6;
const dragItemAttribute = "data-asset-manager-drag-key";

export const getAssetManagerDragKeyProps = (item: AssetManagerSelection) => ({
  [dragItemAttribute]: getAssetManagerSelectionKey(item),
});

export const renderAssetManagerDragPreview = ({
  container,
  items,
}: {
  container: HTMLElement;
  items: readonly AssetManagerSelection[];
}) => {
  const elementsByKey = new Map(
    Array.from(
      document.querySelectorAll<HTMLElement>(`[${dragItemAttribute}]`)
    ).map((element) => [element.getAttribute(dragItemAttribute), element])
  );
  const elements = items.flatMap((item) => {
    const element = elementsByKey.get(getAssetManagerSelectionKey(item));
    return element === undefined ? [] : [element];
  });
  if (elements.length < 2) {
    return false;
  }

  const previewElements = elements.slice(0, previewItemLimit);
  const { width, height } = previewElements[0]!.getBoundingClientRect();
  const maximumOffset = previewItemOffset * (previewElements.length - 1);
  Object.assign(container.style, {
    width: `${width + maximumOffset}px`,
    height: `${height + maximumOffset}px`,
  });

  previewElements.reverse().forEach((element, reverseIndex) => {
    const index = previewElements.length - reverseIndex - 1;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    clone.removeAttribute("tabindex");
    clone.setAttribute("aria-hidden", "true");
    clone.inert = true;
    Object.assign(clone.style, {
      position: "absolute",
      top: `${previewItemOffset * index}px`,
      left: `${previewItemOffset * index}px`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: "none",
    });
    container.appendChild(clone);
  });
  return true;
};

export const setAssetManagerDragPreview = ({
  nativeSetDragImage,
  sourceElement,
  input,
  items,
}: {
  nativeSetDragImage: Parameters<
    typeof setCustomNativeDragPreview
  >[0]["nativeSetDragImage"];
  sourceElement: HTMLElement;
  input: Parameters<typeof preserveOffsetOnSource>[0]["input"];
  items: readonly AssetManagerSelection[];
}) => {
  if (items.length < 2) {
    return;
  }
  setCustomNativeDragPreview({
    nativeSetDragImage,
    getOffset: preserveOffsetOnSource({ element: sourceElement, input }),
    render: ({ container }) => {
      renderAssetManagerDragPreview({ container, items });
    },
  });
};
