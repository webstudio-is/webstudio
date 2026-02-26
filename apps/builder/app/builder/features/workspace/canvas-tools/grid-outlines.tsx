import { useMemo, useLayoutEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { css } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import { $gridCellData } from "~/shared/nano-states";
import {
  $scale,
  $gridEditingTrack,
  $gridEditingArea,
} from "~/builder/shared/nano-states";

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

  // Apply canvas CSS to the mirror div via cssText — bypasses React's
  // style system so we can sync any property without type gymnastics.
  // useLayoutEffect (not useEffect) to apply styles synchronously before
  // paint, avoiding a one-frame flash of unstyled content.
  useLayoutEffect(() => {
    if (mirrorRef.current && resolvedCssText !== undefined) {
      mirrorRef.current.style.cssText = resolvedCssText;
    }
  }, [resolvedCssText]);

  if (!gridCellData) {
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
