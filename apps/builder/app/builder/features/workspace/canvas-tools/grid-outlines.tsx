import { useMemo, useLayoutEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { css } from "@webstudio-is/design-system";
import { theme, textVariants } from "@webstudio-is/design-system";
import { $gridCellData } from "~/shared/nano-states";
import {
  $scale,
  $gridEditingTrack,
  $gridEditingArea,
} from "~/builder/shared/nano-states";
import { $ephemeralStyles } from "~/canvas/stores";
import { parseGridAreas } from "@webstudio-is/css-data";

// Compute the AABB offset that CSS transforms cause, by letting the browser
// do all parsing and matrix composition via a hidden probe element.
// No manual parsing of translate/rotate/scale values — works with any CSS,
// including variables already resolved to computed values on the canvas.
const getTransformOffset = (cssText: string): { dx: number; dy: number } => {
  const probe = document.createElement("div");
  // Apply the same CSS as the canvas element (width, height, transform,
  // transform-origin, translate, rotate, scale, etc.)
  probe.style.cssText = cssText;
  // Override layout: fixed at viewport origin, invisible
  probe.style.position = "fixed";
  probe.style.left = "0px";
  probe.style.top = "0px";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const bcr = probe.getBoundingClientRect();
  document.body.removeChild(probe);
  // Without transforms the probe sits at (0, 0).
  // The delta is the displacement caused by CSS transforms.
  return { dx: bcr.left, dy: bcr.top };
};

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

// Use the browser's CSS parser to extract a single property from cssText.
// Never write ad-hoc regex/string parsers for CSS values.
const probe = document.createElement("div");
const getPropertyFromCssText = (cssText: string, property: string): string => {
  probe.style.cssText = cssText;
  return probe.style.getPropertyValue(property);
};

// Build a map of "col,row" → area name from cssText.
// Only the top-left cell of each named area gets an entry so the
// label appears once, not in every spanned cell.
const getAreaNamesByCell = (cssText: string): Map<string, string> => {
  const areas = getPropertyFromCssText(cssText, "grid-template-areas");
  const result = new Map<string, string>();
  for (const { name, columnStart, rowStart } of parseGridAreas(areas)) {
    result.set(`${columnStart},${rowStart}`, name);
  }
  return result;
};

// Build a set of all "col,row" keys that belong to any named area.
// Used to suppress per-cell outlines inside areas.
const getAreaCells = (cssText: string): Set<string> => {
  const areas = getPropertyFromCssText(cssText, "grid-template-areas");
  const result = new Set<string>();
  for (const { columnStart, columnEnd, rowStart, rowEnd } of parseGridAreas(
    areas
  )) {
    for (let row = rowStart; row < rowEnd; row++) {
      for (let col = columnStart; col < columnEnd; col++) {
        result.add(`${col},${row}`);
      }
    }
  }
  return result;
};

// Return the full parsed area spans for rendering merged area outlines.
const getAreaSpans = (cssText: string) => {
  const areas = getPropertyFromCssText(cssText, "grid-template-areas");
  return parseGridAreas(areas);
};

const cellStyle = css({
  pointerEvents: "none",
  outline: `1px dashed ${theme.colors.borderMain}`,
  outlineOffset: "-0.5px",
  // Area cells suppress their per-cell outline; a merged area outline
  // div renders a single border around the whole area instead.
  "&[data-area]": {
    outline: "none",
  },
});

const areaOutlineStyle = css({
  pointerEvents: "none",
  outline: `1px solid ${theme.colors.borderMain}`,
  outlineOffset: "-0.5px",
});

const areaLabelStyle = css(textVariants.regular, {
  position: "absolute",
  top: 2,
  left: 4,
  color: theme.colors.foregroundSubtle,
  pointerEvents: "none",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "calc(100% - 8px)",
});

const highlightStyle = css({
  pointerEvents: "none",
  backgroundColor: "oklch(94.8% 0.027 246.4 / 0.6)",
});

export const GridOutlines = () => {
  const gridCellData = useStore($gridCellData);
  const gridEditingTrack = useStore($gridEditingTrack);
  const gridEditingArea = useStore($gridEditingArea);
  const scale = useStore($scale);
  const ephemeralStyles = useStore($ephemeralStyles);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const resolvedCssText = gridCellData?.resolvedCssText;

  // Compute the transform-induced offset so we can position the wrapper at
  // the untransformed layout origin. The mirror div then re-applies the CSS
  // transforms, landing the overlay at the correct visual position.
  // Uses a hidden probe element — the browser handles all CSS parsing.
  const transformOffset = useMemo(
    () =>
      resolvedCssText ? getTransformOffset(resolvedCssText) : { dx: 0, dy: 0 },
    [resolvedCssText]
  );

  // Parse area names from the cssText — only the top-left cell gets a label
  const areaNames = useMemo(
    () => getAreaNamesByCell(resolvedCssText ?? ""),
    [resolvedCssText]
  );

  // Set of all cells covered by any named area — for outline styling
  const areaCells = useMemo(
    () => getAreaCells(resolvedCssText ?? ""),
    [resolvedCssText]
  );

  // Full area spans for rendering merged outlines
  const areaSpans = useMemo(
    () => getAreaSpans(resolvedCssText ?? ""),
    [resolvedCssText]
  );

  // Apply canvas CSS to the mirror div via cssText — bypasses React's
  // style system so we can sync any property without type gymnastics.
  // useLayoutEffect (not useEffect) to apply styles synchronously before
  // paint, avoiding a one-frame flash of unstyled content.
  useLayoutEffect(() => {
    if (mirrorRef.current && resolvedCssText !== undefined) {
      mirrorRef.current.style.cssText = resolvedCssText;
    }
  }, [resolvedCssText]);

  if (!gridCellData || ephemeralStyles.length !== 0) {
    return null;
  }

  const {
    bcr,
    untransformedWidth,
    untransformedHeight,
    columnCount,
    rowCount,
  } = gridCellData;

  const scaleFactor = scale / 100;

  // Recover untransformed position: BCR includes transforms, subtract them.
  const untransformedLeft = bcr.left - transformOffset.dx;
  const untransformedTop = bcr.top - transformOffset.dy;

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
          transform: `scale(${scaleFactor}) translate3d(${untransformedLeft}px, ${untransformedTop}px, 0)`,
          transformOrigin: "0 0",
          width: untransformedWidth,
          height: untransformedHeight,
          pointerEvents: "none",
        }}
      >
        {/* Grid mirror: faithfully reproduces the canvas element's CSS.
            Styles applied via cssText in useEffect — adding a new synced
            property only requires a one-line change in grid-outline-utils. */}
        <div ref={mirrorRef}>
          {cells.map(({ col, row }) => {
            const areaName = areaNames.get(`${col},${row}`);
            const isArea = areaCells.has(`${col},${row}`);
            return (
              <div
                key={`${col}-${row}`}
                className={cellStyle()}
                data-area={isArea ? "" : undefined}
                style={{
                  gridColumn: col,
                  gridRow: row,
                  position: "relative",
                }}
              >
                {areaName && (
                  <span className={areaLabelStyle()}>{areaName}</span>
                )}
              </div>
            );
          })}
          {/* Merged area outlines: one div per named area spanning its
              full grid region, rendered after cells so it paints on top. */}
          {areaSpans.map((area) => (
            <div
              key={`area-outline-${area.name}`}
              className={areaOutlineStyle()}
              style={{
                gridColumn: `${area.columnStart} / ${area.columnEnd}`,
                gridRow: `${area.rowStart} / ${area.rowEnd}`,
              }}
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
