import {
  createAssetManagerSelectionRect,
  doAssetManagerSelectionRectsIntersect,
  getAssetManagerSelectionKey,
  type AssetManagerSelection,
} from "./asset-manager-selection";

export type AssetManagerMarqueeRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const activationDistance = 4;
const scrollEdge = 24;
const scrollStep = 12;

export const startAssetManagerMarquee = ({
  pointerId,
  start,
  panel,
  listbox,
  items,
  initialSelection,
  getItemElement,
  onSelectionChange,
  onRectChange,
  onFinish,
  onCancel,
}: {
  pointerId: number;
  start: { x: number; y: number };
  panel: HTMLElement;
  listbox: HTMLElement;
  items: readonly AssetManagerSelection[];
  initialSelection: readonly AssetManagerSelection[];
  getItemElement: (item: AssetManagerSelection) => HTMLElement | undefined;
  onSelectionChange: (items: AssetManagerSelection[]) => void;
  onRectChange: (rect: AssetManagerMarqueeRect | undefined) => void;
  onFinish: (items: AssetManagerSelection[], active: boolean) => void;
  onCancel: () => void;
}) => {
  let latestSelection = [...initialSelection];
  let active = false;
  let disposed = false;
  const previousUserSelect = document.documentElement.style.userSelect;
  const scrollViewport = listbox.closest<HTMLElement>(
    "[data-asset-manager-scroll-area]"
  );
  const getBounds = () =>
    scrollViewport?.getBoundingClientRect() ?? panel.getBoundingClientRect();

  const cleanup = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
    document.removeEventListener("pointercancel", handlePointerCancel);
    document.documentElement.style.userSelect = previousUserSelect;
    onRectChange(undefined);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    const distance = Math.hypot(
      event.clientX - start.x,
      event.clientY - start.y
    );
    if (active === false && distance < activationDistance) {
      return;
    }
    if (active === false) {
      active = true;
      document.documentElement.style.userSelect = "none";
    }
    event.preventDefault();

    const bounds = getBounds();
    if (
      scrollViewport !== null &&
      typeof scrollViewport.scrollBy === "function"
    ) {
      const scrollTop =
        event.clientY < bounds.top + scrollEdge
          ? -scrollStep
          : event.clientY > bounds.bottom - scrollEdge
            ? scrollStep
            : 0;
      if (scrollTop !== 0) {
        scrollViewport.scrollBy({ top: scrollTop });
      }
    }

    const end = {
      x: Math.min(Math.max(event.clientX, bounds.left), bounds.right),
      y: Math.min(Math.max(event.clientY, bounds.top), bounds.bottom),
    };
    const selectionRect = createAssetManagerSelectionRect(start, end);
    const intersectingItems = items.filter((item) => {
      const element = getItemElement(item);
      return (
        element !== undefined &&
        doAssetManagerSelectionRectsIntersect(
          selectionRect,
          element.getBoundingClientRect()
        )
      );
    });
    const selectedKeys = new Set(
      initialSelection.map(getAssetManagerSelectionKey)
    );
    latestSelection = [
      ...initialSelection,
      ...intersectingItems.filter(
        (item) => selectedKeys.has(getAssetManagerSelectionKey(item)) === false
      ),
    ];
    onSelectionChange(latestSelection);

    const panelRect = panel.getBoundingClientRect();
    onRectChange({
      left: selectionRect.left - panelRect.left,
      top: selectionRect.top - panelRect.top,
      width: selectionRect.right - selectionRect.left,
      height: selectionRect.bottom - selectionRect.top,
    });
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    cleanup();
    onFinish(latestSelection, active);
  };

  const handlePointerCancel = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    cleanup();
    onCancel();
  };

  document.addEventListener("pointermove", handlePointerMove, {
    passive: false,
  });
  document.addEventListener("pointerup", handlePointerUp);
  document.addEventListener("pointercancel", handlePointerCancel);
  return cleanup;
};
