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
const OVERLAP = 2;

const Container = styled(Box, {
  position: "absolute",
  zIndex: 1,
});

const CircleOutline = styled(Box, {
  width: CIRCLE_SIZE + OUTLINE_WIDTH * 2,
  height: CIRCLE_SIZE + OUTLINE_WIDTH * 2,
  position: "absolute",
  top: -CIRCLE_SIZE / 2 - OUTLINE_WIDTH,
  left: -CIRCLE_SIZE / 2 - OUTLINE_WIDTH,
  borderRadius: "50%",
  pointerEvents: "none",
  backgroundColor: theme.colors.borderContrast,
});

const Circle = styled(Box, {
  width: CIRCLE_SIZE,
  height: CIRCLE_SIZE,
  position: "absolute",
  top: -CIRCLE_SIZE / 2,
  left: -CIRCLE_SIZE / 2,
  border: `2px solid ${theme.colors.backgroundPrimary}`,
  borderRadius: "50%",
  pointerEvents: "none",
});

const Line = styled(Box, {
  boxSizing: "content-box",
  position: "absolute",
  top: -LINE_THICKNESS / 2,
  left: 0,
  width: "100%",
  height: LINE_THICKNESS,
  backgroundColor: theme.colors.backgroundPrimary,
  pointerEvents: "none",
  outline: `solid ${theme.colors.borderContrast}`,
  outlineWidth: OUTLINE_WIDTH,
});

const LineWithNub = styled(Line, {
  left: CIRCLE_SIZE / 2 - OVERLAP,
  width: `calc(100% - ${CIRCLE_SIZE / 2 - OVERLAP}px)`,
});

export const ListPositionIndicator = ({
  x,
  y,
  length,
}: {
  x: number | string;
  y: number | string;
  length: number | string;
}) => {
  return (
    <Container style={{ top: y, left: x, width: length }}>
      <Line />
    </Container>
  );
};

export const TreePositionIndicator = ({
  x,
  y,
  length,
}: {
  x: number | string;
  y: number | string;
  length: number | string;
}) => {
  return (
    <Container style={{ top: y, left: x, width: length }}>
      <CircleOutline />
      <LineWithNub />
      <Circle />
    </Container>
  );
};
