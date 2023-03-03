import { KeyboardEventHandler, useState } from "react";
import { css, theme } from "../stitches.config";
import { Box } from "./box";
import { Grid } from "./grid";

// prettier-ignore
const positions = [
  [0, 0],   [50, 0],   [100, 0],
  [0, 50],  [50, 50], [100, 50],
  [0, 100], [50, 100], [100, 100],
];

const containerStyle = css({
  padding: theme.spacing[4],
  width: "fit-content",
  borderRadius: theme.borderRadius[4],
  outline: `1px solid ${theme.colors.borderMain}`,
  gridTemplateColumns: "repeat(3, 1fr)",
  gridTemplateAreas: `
    "x x x"
    "x x x"
    "x x x"
  `,
  "&[data-focused=true], &:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
  },
});

const dotStyle = css({
  padding: theme.spacing[5],
  background: theme.colors.backgroundControls,
  borderRadius: theme.borderRadius[4],
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
    background: theme.colors.backgroundHover,
    "&::before": {
      background: theme.colors.foregroundGridControlsDotHover,
    },
  },
  "&[data-focused=true]": {
    outline: `2px solid ${theme.colors.borderFocus}`,
    outlineOffset: -2,
  },
});

type Position = { top: number; left: number };

const useKeyboard = ({
  onSelect,
  focusedPosition,
}: {
  focusedPosition?: Position;
  onSelect: (position: Position) => void;
}) => {
  // -50 is to prevent the focus to be on the first item when the grid is not focused
  const [top, setTop] = useState(focusedPosition?.top ?? -50);
  const [left, setLeft] = useState(focusedPosition?.left ?? 0);

  const handleKeyDown: KeyboardEventHandler = (event) => {
    switch (event.key) {
      case "ArrowUp": {
        setTop(top <= 0 ? 100 : top - 50);
        break;
      }
      case "ArrowDown": {
        setTop(top >= 100 ? 0 : top + 50);
        break;
      }
      case "ArrowLeft": {
        setLeft(left <= 0 ? 100 : left - 50);
        break;
      }
      case "ArrowRight": {
        setLeft(left >= 100 ? 0 : left + 50);
        break;
      }
      case "Enter": {
        if (top >= 0 && left >= 0) {
          onSelect({ top, left });
        }
        break;
      }
    }
  };

  return { handleKeyDown, focusedKey: `${left}-${top}` };
};

type PositionGridProps = {
  focusedPosition?: Position;
  selectedPosition?: Position;
  focused?: boolean;
  onSelect: (position: Position) => void;
};

/**
 * It will render selected item when the top/left values in `selectedPosition` are 0, 50 or 100.
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
  return (
    <Grid
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-focused={focused}
      className={containerStyle()}
    >
      {positions.map(([left, top]) => {
        const selectedKey = `${selectedPosition?.left}-${selectedPosition?.top}`;
        const positionKey = `${left}-${top}`;
        return (
          <Box
            key={positionKey}
            data-selected={selectedKey === positionKey}
            data-focused={focusedKey === positionKey}
            className={dotStyle()}
            onClick={() => {
              onSelect({ left, top });
            }}
          />
        );
      })}
    </Grid>
  );
};
