import { css, theme, useDrag } from "@webstudio-is/design-system";
import {
  canvasRectStore,
  canvasWidthStore,
  isCanvasPointerEventsEnabledStore,
} from "~/builder/shared/nano-states";
import { minCanvasWidth } from "~/shared/breakpoints";

const handleStyle = css({
  position: "absolute",
  top: 0,
  width: 4,
  bottom: 0,
  cursor: "col-resize",
  pointerEvents: "auto",
  "&:hover": {
    background: theme.colors.backgroundPrimaryLight,
  },
  "&[data-align=left]": {
    left: 0,
  },
  "&[data-align=right]": {
    right: 0,
  },
});

const baseDragProps = {
  startDistanceThreashold: 0,
  onStart() {
    isCanvasPointerEventsEnabledStore.set(false);
  },
  onEnd() {
    isCanvasPointerEventsEnabledStore.set(true);
  },
};

export const ResizeHandles = () => {
  const { rootRef: leftRootRef } = useDrag({
    ...baseDragProps,
    onMove({ x }) {
      const rect = canvasRectStore.get();
      if (rect) {
        canvasWidthStore.set(
          Math.round(Math.max(rect.right - x, minCanvasWidth))
        );
      }
    },
  });
  const { rootRef: rightRootRef } = useDrag({
    ...baseDragProps,
    onMove({ x }) {
      const rect = canvasRectStore.get();
      if (rect) {
        canvasWidthStore.set(
          Math.max(Math.round(x - rect.left), minCanvasWidth)
        );
      }
    },
  });
  return (
    <>
      <div ref={leftRootRef} className={handleStyle()} data-align="left" />
      <div ref={rightRootRef} className={handleStyle()} data-align="right" />
    </>
  );
};
