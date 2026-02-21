import { clamp } from "@react-aria/utils";
import { useStore } from "@nanostores/react";
import { css, type Rect } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import { $gridCellData } from "~/shared/nano-states";
import {
  $clampingRect,
  $scale,
  $gridEditingTrack,
  $gridEditingArea,
} from "~/builder/shared/nano-states";

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

const highlightStyle = css({
  position: "absolute",
  pointerEvents: "none",
  backgroundColor: theme.colors.backgroundInfoNotification,
  opacity: 0.6,
});

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
  const clampedY = clamp(
    scaledY,
    clampingRect.top,
    clampingRect.top + clampingRect.height
  );
  const clampedLeft = clamp(
    scaledX,
    clampingRect.left,
    clampingRect.left + clampingRect.width
  );
  const clampedRight = clamp(
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
  const clampedX = clamp(
    scaledX,
    clampingRect.left,
    clampingRect.left + clampingRect.width
  );
  const clampedTop = clamp(
    scaledY,
    clampingRect.top,
    clampingRect.top + clampingRect.height
  );
  const clampedBottom = clamp(
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

type TrackHighlightProps = {
  type: "column" | "row";
  index: number;
  horizontalLines: Array<{ y: number; x: number; width: number }>;
  verticalLines: Array<{ x: number; y: number; height: number }>;
  clampingRect: Rect;
  scale: number;
};

const TrackHighlight = ({
  type,
  index,
  horizontalLines,
  verticalLines,
  clampingRect,
  scale,
}: TrackHighlightProps) => {
  const scaleFactor = scale / 100;

  if (type === "column") {
    // Column highlight: between verticalLines[index] and verticalLines[index + 1]
    if (index >= verticalLines.length || index + 1 >= verticalLines.length) {
      return null;
    }
    const leftLine = verticalLines[index];
    const rightLine = verticalLines[index + 1];
    // Use the full height from the first horizontal line to the last
    const topLine = horizontalLines[0];
    const bottomLine = horizontalLines[horizontalLines.length - 1];
    if (!topLine || !bottomLine) {
      return null;
    }

    const x = leftLine.x * scaleFactor;
    const y = topLine.y * scaleFactor;
    const width = (rightLine.x - leftLine.x) * scaleFactor;
    const height = (bottomLine.y - topLine.y) * scaleFactor;

    // Clamp to visible area
    const clampedLeft = clamp(
      x,
      clampingRect.left,
      clampingRect.left + clampingRect.width
    );
    const clampedRight = clamp(
      x + width,
      clampingRect.left,
      clampingRect.left + clampingRect.width
    );
    const clampedTop = clamp(
      y,
      clampingRect.top,
      clampingRect.top + clampingRect.height
    );
    const clampedBottom = clamp(
      y + height,
      clampingRect.top,
      clampingRect.top + clampingRect.height
    );

    const clampedWidth = clampedRight - clampedLeft;
    const clampedHeight = clampedBottom - clampedTop;

    if (clampedWidth <= 0 || clampedHeight <= 0) {
      return null;
    }

    return (
      <div
        className={highlightStyle()}
        style={{
          transform: `translate3d(${clampedLeft}px, ${clampedTop}px, 0)`,
          width: clampedWidth,
          height: clampedHeight,
        }}
      />
    );
  }

  // Row highlight: between horizontalLines[index] and horizontalLines[index + 1]
  if (index >= horizontalLines.length || index + 1 >= horizontalLines.length) {
    return null;
  }
  const topLine = horizontalLines[index];
  const bottomLine = horizontalLines[index + 1];
  // Use the full width from the first vertical line to the last
  const leftLine = verticalLines[0];
  const rightLine = verticalLines[verticalLines.length - 1];
  if (!leftLine || !rightLine) {
    return null;
  }

  const x = leftLine.x * scaleFactor;
  const y = topLine.y * scaleFactor;
  const width = (rightLine.x - leftLine.x) * scaleFactor;
  const height = (bottomLine.y - topLine.y) * scaleFactor;

  // Clamp to visible area
  const clampedLeft = clamp(
    x,
    clampingRect.left,
    clampingRect.left + clampingRect.width
  );
  const clampedRight = clamp(
    x + width,
    clampingRect.left,
    clampingRect.left + clampingRect.width
  );
  const clampedTop = clamp(
    y,
    clampingRect.top,
    clampingRect.top + clampingRect.height
  );
  const clampedBottom = clamp(
    y + height,
    clampingRect.top,
    clampingRect.top + clampingRect.height
  );

  const clampedWidth = clampedRight - clampedLeft;
  const clampedHeight = clampedBottom - clampedTop;

  if (clampedWidth <= 0 || clampedHeight <= 0) {
    return null;
  }

  return (
    <div
      className={highlightStyle()}
      style={{
        transform: `translate3d(${clampedLeft}px, ${clampedTop}px, 0)`,
        width: clampedWidth,
        height: clampedHeight,
      }}
    />
  );
};

type AreaHighlightProps = {
  columnStart: number;
  columnEnd: number;
  rowStart: number;
  rowEnd: number;
  horizontalLines: Array<{ y: number; x: number; width: number }>;
  verticalLines: Array<{ x: number; y: number; height: number }>;
  clampingRect: Rect;
  scale: number;
};

const AreaHighlight = ({
  columnStart,
  columnEnd,
  rowStart,
  rowEnd,
  horizontalLines,
  verticalLines,
  clampingRect,
  scale,
}: AreaHighlightProps) => {
  const scaleFactor = scale / 100;

  // Get the lines that bound this area
  // columnStart is 1-based, verticalLines[0] is the left edge of column 1
  const leftLineIndex = columnStart - 1;
  const rightLineIndex = columnEnd - 1;
  const topLineIndex = rowStart - 1;
  const bottomLineIndex = rowEnd - 1;

  if (
    leftLineIndex < 0 ||
    rightLineIndex >= verticalLines.length ||
    topLineIndex < 0 ||
    bottomLineIndex >= horizontalLines.length
  ) {
    return null;
  }

  const leftLine = verticalLines[leftLineIndex];
  const rightLine = verticalLines[rightLineIndex];
  const topLine = horizontalLines[topLineIndex];
  const bottomLine = horizontalLines[bottomLineIndex];

  const x = leftLine.x * scaleFactor;
  const y = topLine.y * scaleFactor;
  const width = (rightLine.x - leftLine.x) * scaleFactor;
  const height = (bottomLine.y - topLine.y) * scaleFactor;

  // Clamp to visible area
  const clampedLeft = clamp(
    x,
    clampingRect.left,
    clampingRect.left + clampingRect.width
  );
  const clampedRight = clamp(
    x + width,
    clampingRect.left,
    clampingRect.left + clampingRect.width
  );
  const clampedTop = clamp(
    y,
    clampingRect.top,
    clampingRect.top + clampingRect.height
  );
  const clampedBottom = clamp(
    y + height,
    clampingRect.top,
    clampingRect.top + clampingRect.height
  );

  const clampedWidth = clampedRight - clampedLeft;
  const clampedHeight = clampedBottom - clampedTop;

  if (clampedWidth <= 0 || clampedHeight <= 0) {
    return null;
  }

  return (
    <div
      className={highlightStyle()}
      style={{
        transform: `translate3d(${clampedLeft}px, ${clampedTop}px, 0)`,
        width: clampedWidth,
        height: clampedHeight,
      }}
    />
  );
};

export const GridOutlines = () => {
  const gridCellData = useStore($gridCellData);
  const gridEditingTrack = useStore($gridEditingTrack);
  const gridEditingArea = useStore($gridEditingArea);
  const scale = useStore($scale);
  const clampingRect = useStore($clampingRect);

  if (!gridCellData || !clampingRect) {
    return null;
  }

  const { horizontalLines, verticalLines } = gridCellData;

  return (
    <div className={containerStyle()}>
      {gridEditingTrack && (
        <TrackHighlight
          type={gridEditingTrack.type}
          index={gridEditingTrack.index}
          horizontalLines={horizontalLines}
          verticalLines={verticalLines}
          clampingRect={clampingRect}
          scale={scale}
        />
      )}
      {gridEditingArea && (
        <AreaHighlight
          columnStart={gridEditingArea.columnStart}
          columnEnd={gridEditingArea.columnEnd}
          rowStart={gridEditingArea.rowStart}
          rowEnd={gridEditingArea.rowEnd}
          horizontalLines={horizontalLines}
          verticalLines={verticalLines}
          clampingRect={clampingRect}
          scale={scale}
        />
      )}
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
