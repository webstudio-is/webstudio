import { type KeyboardEventHandler, useState } from "react";
import { css, theme } from "../stitches.config";
import { Box } from "./box";
import { Grid } from "./grid";

// prettier-ignore
const positions = [
  [0, 0],   [50, 0],   [100, 0],
  [0, 50],  [50, 50], [100, 50],
  [0, 100], [50, 100], [100, 100],
];

type Position = { y: number; x: number };
type MixedPosition = { y: number | string; x: number | string };

const keywordNumberMap: Record<string, number> = {
  x: 0,
  y: 0,
  center: 50,
  right: 100,
  bottom: 100,
};

const toNumericPosition = (position?: MixedPosition) => {
  if (position === undefined) {
    return;
  }
  return {
    x: keywordNumberMap[position.x] ?? position.x,
    y: keywordNumberMap[position.y] ?? position.y,
  };
};

const containerStyle = css({
  background: theme.colors.backgroundControls,
  padding: theme.spacing[4],
  width: "fit-content",
  borderRadius: theme.borderRadius[4],
  border: `1px solid transparent`,
  outline: "none",
  gridTemplateColumns: "repeat(3, 1fr)",
  gridTemplateAreas: `
    "x x x"
    "x x x"
    "x x x"
  `,
  "&[data-focused=true], &:focus-visible": {
    borderColor: theme.colors.borderFocus,
  },
});

const dotStyle = css({
  padding: theme.spacing[5],
  background: theme.colors.backgroundControls,
  border: `1px solid transparent`,
  borderRadius: theme.borderRadius[4],
  outline: "none",
  minWidth: "auto",
  "&::before": {
    content: '""',
    display: "block",
    width: theme.spacing[3],
    height: theme.spacing[3],
    background: theme.colors.foregroundGridControlsDot,
    borderRadius: "50%",
  },
  "&[data-selected=true], &:hover": {
    background: theme.colors.foregroundGridControlsFlexHover,
    "&::before": {
      background: theme.colors.foregroundGridControlsDotHover,
    },
  },
  "&[data-focused=true]": {
    borderColor: theme.colors.borderFocus,
  },
});

const useKeyboard = ({
  onSelect,
  focusedPosition,
}: {
  focusedPosition?: Position;
  onSelect: (position: Position) => void;
}) => {
  // -50 is to prevent the focus to be on the first item when the grid is not focused
  const [y, setTop] = useState(focusedPosition?.y ?? -50);
  const [x, setLeft] = useState(focusedPosition?.x ?? 0);

  const handleKeyDown: KeyboardEventHandler = (event) => {
    switch (event.key) {
      case "ArrowUp": {
        setTop(y <= 0 ? 100 : y - 50);
        break;
      }
      case "ArrowDown": {
        setTop(y >= 100 ? 0 : y + 50);
        break;
      }
      case "ArrowLeft": {
        setLeft(x <= 0 ? 100 : x - 50);
        break;
      }
      case "ArrowRight": {
        setLeft(x >= 100 ? 0 : x + 50);
        break;
      }
      case "Enter": {
        if (y >= 0 && x >= 0) {
          onSelect({ y, x });
        }
        break;
      }
    }
  };

  return { handleKeyDown, focusedKey: `${x}-${y}` };
};

type PositionGridProps = {
  focusedPosition?: Position;
  selectedPosition?: MixedPosition;
  focused?: boolean;
  onSelect: (position: Position) => void;
};

/**
 * It will render selected item when the y/x values in `selectedPosition` are 0, 50 or 100.
 * All other values will be ignored.
 * Props `focused` and `focusedPosition` are for testing only, because they shold be set by interactions.
 */
export const PositionGrid = ({
  selectedPosition,
  focusedPosition,
  focused = false,
  onSelect,
}: PositionGridProps) => {
  const { handleKeyDown, focusedKey } = useKeyboard({
    onSelect,
    focusedPosition,
  });
  const numericSelectedPosition = toNumericPosition(selectedPosition);

  return (
    <Grid
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-focused={focused}
      className={containerStyle()}
    >
      {positions.map(([x, y]) => {
        const selectedKey = `${numericSelectedPosition?.x}-${numericSelectedPosition?.y}`;
        const positionKey = `${x}-${y}`;
        return (
          <Box
            key={positionKey}
            data-selected={selectedKey === positionKey}
            data-focused={focusedKey === positionKey}
            className={dotStyle()}
            onClick={() => {
              onSelect({ x, y });
            }}
          />
        );
      })}
    </Grid>
  );
};
