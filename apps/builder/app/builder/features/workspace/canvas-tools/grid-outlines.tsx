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
    resolvedColumnTemplate,
    resolvedRowTemplate,
    resolvedColumnGap,
    resolvedRowGap,
    resolvedPadding,
    resolvedBorderWidth,
    resolvedDirection,
    resolvedJustifyContent,
    resolvedAlignContent,
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
      <div
        style={{
          position: "absolute",
          display: "grid",
          // Resolved CSS strings from canvas — passed through as-is.
          // CSS transform: scale() handles canvas→screen conversion.
          gridTemplateColumns: resolvedColumnTemplate,
          gridTemplateRows: resolvedRowTemplate,
          columnGap: resolvedColumnGap,
          rowGap: resolvedRowGap,
          padding: resolvedPadding,
          borderWidth: resolvedBorderWidth,
          borderStyle: "solid",
          borderColor: "transparent",
          direction: resolvedDirection as "ltr" | "rtl",
          justifyContent: resolvedJustifyContent,
          alignContent: resolvedAlignContent,
          // Always border-box: width/height come from getBoundingClientRect
          boxSizing: "border-box",
          // Position and size in canvas coordinates, scaled uniformly
          left: 0,
          top: 0,
          transform: `scale(${scaleFactor}) translate3d(${rect.left}px, ${rect.top}px, 0)`,
          transformOrigin: "0 0",
          width: rect.width,
          height: rect.height,
          pointerEvents: "none",
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
  );
};
