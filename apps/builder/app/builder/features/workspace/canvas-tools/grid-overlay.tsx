import { useStore } from "@nanostores/react";
import { css, type Rect } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import { $gridCellData } from "~/shared/nano-states";
import { $clampingRect, $scale } from "~/builder/shared/nano-states";

const containerStyle = css({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  overflow: "hidden",
});

const lineStyle = css({
  position: "absolute",
  pointerEvents: "none",
  variants: {
    orientation: {
      horizontal: {
        height: 1,
        borderTop: `1px dashed ${theme.colors.borderMain}`,
      },
      vertical: {
        width: 1,
        borderLeft: `1px dashed ${theme.colors.borderMain}`,
      },
    },
  },
});

const clampValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const HorizontalLine = ({
  y,
  x,
  width,
  clampingRect,
  scale,
}: {
  y: number;
  x: number;
  width: number;
  clampingRect: Rect;
  scale: number;
}) => {
  const scaleFactor = scale / 100;
  const scaledY = y * scaleFactor;
  const scaledX = x * scaleFactor;
  const scaledWidth = width * scaleFactor;

  // Clamp to visible area
  const clampedY = clampValue(
    scaledY,
    clampingRect.top,
    clampingRect.top + clampingRect.height
  );
  const clampedLeft = clampValue(
    scaledX,
    clampingRect.left,
    clampingRect.left + clampingRect.width
  );
  const clampedRight = clampValue(
    scaledX + scaledWidth,
    clampingRect.left,
    clampingRect.left + clampingRect.width
  );
  const clampedWidth = clampedRight - clampedLeft;

  // Don't render if outside visible area or no width
  if (
    scaledY < clampingRect.top ||
    scaledY > clampingRect.top + clampingRect.height ||
    clampedWidth <= 0
  ) {
    return null;
  }

  return (
    <div
      className={lineStyle({ orientation: "horizontal" })}
      style={{
        transform: `translate3d(${clampedLeft}px, ${clampedY}px, 0)`,
        width: clampedWidth,
      }}
    />
  );
};

const VerticalLine = ({
  x,
  y,
  height,
  clampingRect,
  scale,
}: {
  x: number;
  y: number;
  height: number;
  clampingRect: Rect;
  scale: number;
}) => {
  const scaleFactor = scale / 100;
  const scaledX = x * scaleFactor;
  const scaledY = y * scaleFactor;
  const scaledHeight = height * scaleFactor;

  // Clamp to visible area
  const clampedX = clampValue(
    scaledX,
    clampingRect.left,
    clampingRect.left + clampingRect.width
  );
  const clampedTop = clampValue(
    scaledY,
    clampingRect.top,
    clampingRect.top + clampingRect.height
  );
  const clampedBottom = clampValue(
    scaledY + scaledHeight,
    clampingRect.top,
    clampingRect.top + clampingRect.height
  );
  const clampedHeight = clampedBottom - clampedTop;

  // Don't render if outside visible area or no height
  if (
    scaledX < clampingRect.left ||
    scaledX > clampingRect.left + clampingRect.width ||
    clampedHeight <= 0
  ) {
    return null;
  }

  return (
    <div
      className={lineStyle({ orientation: "vertical" })}
      style={{
        transform: `translate3d(${clampedX}px, ${clampedTop}px, 0)`,
        height: clampedHeight,
      }}
    />
  );
};

export const GridOverlay = () => {
  const gridCellData = useStore($gridCellData);
  const scale = useStore($scale);
  const clampingRect = useStore($clampingRect);

  if (!gridCellData || !clampingRect) {
    return null;
  }

  const { horizontalLines, verticalLines } = gridCellData;

  return (
    <div className={containerStyle()}>
      {horizontalLines.map((line, index) => (
        <HorizontalLine
          key={`h-${index}`}
          y={line.y}
          x={line.x}
          width={line.width}
          clampingRect={clampingRect}
          scale={scale}
        />
      ))}
      {verticalLines.map((line, index) => (
        <VerticalLine
          key={`v-${index}`}
          x={line.x}
          y={line.y}
          height={line.height}
          clampingRect={clampingRect}
          scale={scale}
        />
      ))}
    </div>
  );
};
