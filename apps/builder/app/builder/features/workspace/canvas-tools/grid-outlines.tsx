import { useStore } from "@nanostores/react";
import { css } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import { $gridCellData } from "~/shared/nano-states";
import {
  $scale,
  $gridEditingTrack,
  $gridEditingArea,
} from "~/builder/shared/nano-states";

const containerStyle = css({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  overflow: "hidden",
  // contain: strict must live here, not on the grid mirror div.
  // The mirror applies the user's CSS transform, so placing contain
  // on it would clip cells relative to the transformed box instead
  // of the viewport-aligned overlay boundary.
  contain: "strict",
});

const cellStyle = css({
  pointerEvents: "none",
  outline: `1px dashed ${theme.colors.borderMain}`,
  outlineOffset: "-0.5px",
});

const highlightStyle = css({
  pointerEvents: "none",
  backgroundColor: theme.colors.backgroundInfoNotification,
  opacity: 0.6,
});

export const GridOutlines = () => {
  const gridCellData = useStore($gridCellData);
  const gridEditingTrack = useStore($gridEditingTrack);
  const gridEditingArea = useStore($gridEditingArea);
  const scale = useStore($scale);

  if (!gridCellData) {
    return null;
  }

  const {
    rect,
    columnCount,
    rowCount,
    resolvedDisplay,
    resolvedWidth,
    resolvedHeight,
    resolvedBoxSizing,
    resolvedColumnTemplate,
    resolvedRowTemplate,
    resolvedColumnGap,
    resolvedRowGap,
    resolvedPadding,
    resolvedBorderWidth,
    resolvedBorderStyle,
    resolvedDirection,
    resolvedGridTemplateAreas,
    resolvedJustifyContent,
    resolvedJustifyItems,
    resolvedAlignContent,
    resolvedTransform,
    resolvedTransformOrigin,
  } = gridCellData;

  const scaleFactor = scale / 100;

  // Generate one cell per grid slot
  const cells: Array<{ col: number; row: number }> = [];
  for (let row = 1; row <= rowCount; row++) {
    for (let col = 1; col <= columnCount; col++) {
      cells.push({ col, row });
    }
  }

  return (
    <div className={containerStyle()}>
      {/* Positioning wrapper: our scale + translate to place the overlay */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `scale(${scaleFactor}) translate3d(${rect.left}px, ${rect.top}px, 0)`,
          transformOrigin: "0 0",
          width: rect.width,
          height: rect.height,
          pointerEvents: "none",
        }}
      >
        {/* Grid mirror: faithfully reproduces the canvas element's CSS */}
        <div
          style={{
            display: resolvedDisplay,
            width: resolvedWidth,
            height: resolvedHeight,
            boxSizing: resolvedBoxSizing as "border-box" | "content-box",
            gridTemplateColumns: resolvedColumnTemplate,
            gridTemplateRows: resolvedRowTemplate,
            gridTemplateAreas: resolvedGridTemplateAreas,
            columnGap: resolvedColumnGap,
            rowGap: resolvedRowGap,
            padding: resolvedPadding,
            borderWidth: resolvedBorderWidth,
            borderStyle: resolvedBorderStyle,
            borderColor: "transparent",
            direction: resolvedDirection as "ltr" | "rtl",
            justifyContent: resolvedJustifyContent,
            justifyItems: resolvedJustifyItems,
            alignContent: resolvedAlignContent,
            transform: resolvedTransform,
            transformOrigin: resolvedTransformOrigin,
          }}
        >
          {cells.map(({ col, row }) => (
            <div
              key={`${col}-${row}`}
              className={cellStyle()}
              style={{ gridColumn: col, gridRow: row }}
            />
          ))}
          {gridEditingTrack && (
            <div
              className={highlightStyle()}
              style={
                gridEditingTrack.type === "column"
                  ? {
                      gridColumn: gridEditingTrack.index + 1,
                      gridRow: "1 / -1",
                    }
                  : {
                      gridColumn: "1 / -1",
                      gridRow: gridEditingTrack.index + 1,
                    }
              }
            />
          )}
          {gridEditingArea && (
            <div
              className={highlightStyle()}
              style={{
                gridColumn: `${gridEditingArea.columnStart} / ${gridEditingArea.columnEnd}`,
                gridRow: `${gridEditingArea.rowStart} / ${gridEditingArea.rowEnd}`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
