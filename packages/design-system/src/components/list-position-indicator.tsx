/**
 * Implementation of the "List Position Indicator" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=8%3A1883
 */

import { Box } from "./box";
import { styled, theme } from "../stitches.config";

const CIRCLE_SIZE = 8;
const LINE_THICKNESS = 2;
const OUTLINE_WIDTH = 1;

// overlap the line with the circle by this much
// to make sure they are connected
const OVERLAP = 1;

const CircleOutline = styled(Box, {
  width: CIRCLE_SIZE + OUTLINE_WIDTH * 2,
  height: CIRCLE_SIZE + OUTLINE_WIDTH * 2,
  position: "absolute",
  borderRadius: "50%",
  pointerEvents: "none",
  bc: theme.colors.borderContrast,
});

const Circle = styled(Box, {
  width: CIRCLE_SIZE,
  height: CIRCLE_SIZE,
  position: "absolute",
  border: `solid ${theme.colors.backgroundPrimary}`,
  borderWidth: 2,
  borderRadius: "50%",
  pointerEvents: "none",
});

const Line = styled(Box, {
  boxSizing: "content-box",
  position: "absolute",
  background: theme.colors.backgroundPrimary,
  pointerEvents: "none",
  outline: `solid ${theme.colors.borderContrast}`,
  outlineWidth: OUTLINE_WIDTH,
});

export const ListPositionIndicator = ({
  x,
  y,
  length,
  withNub = false,
}: {
  x: number;
  y: number;
  length: number;
  withNub?: boolean;
}) =>
  withNub ? (
    <>
      <CircleOutline
        style={{
          top: y - CIRCLE_SIZE / 2 - OUTLINE_WIDTH,
          left: x - CIRCLE_SIZE / 2 - OUTLINE_WIDTH,
        }}
      />
      <Line
        style={{
          top: y - LINE_THICKNESS / 2,
          left: x + (CIRCLE_SIZE / 2 - OVERLAP),
          width: length - (CIRCLE_SIZE / 2 - OVERLAP),
          height: LINE_THICKNESS,
        }}
      />
      <Circle
        style={{
          top: y - CIRCLE_SIZE / 2,
          left: x - CIRCLE_SIZE / 2,
        }}
      />
    </>
  ) : (
    <Line
      style={{
        top: y - LINE_THICKNESS / 2,
        left: x,
        width: length,
        height: LINE_THICKNESS,
      }}
    />
  );
