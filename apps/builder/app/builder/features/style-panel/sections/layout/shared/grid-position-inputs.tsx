import {
  Flex,
  Grid,
  InputField,
  Text,
  theme,
} from "@webstudio-is/design-system";

export type GridPosition = {
  columnStart: number;
  columnEnd: number;
  rowStart: number;
  rowEnd: number;
};

export type GridPositionValidation = {
  isColumnStartValid: boolean;
  isColumnEndValid: boolean;
  isRowStartValid: boolean;
  isRowEndValid: boolean;
};

export const validateGridPosition = (
  position: GridPosition,
  gridColumns: number,
  gridRows: number,
  options: { checkBounds?: boolean; inclusiveEnd?: boolean } = {}
): GridPositionValidation => {
  const { checkBounds = false, inclusiveEnd = false } = options;
  // With inclusiveEnd, end is a track index (end >= start is valid).
  // Without, end is a grid-line number (end > start is required).
  const endOp = inclusiveEnd
    ? (end: number, start: number) => end >= start
    : (end: number, start: number) => end > start;
  const maxCol = inclusiveEnd ? gridColumns : gridColumns + 1;
  const maxRow = inclusiveEnd ? gridRows : gridRows + 1;
  const result = {
    isColumnStartValid:
      position.columnStart >= 1 &&
      endOp(position.columnEnd, position.columnStart),
    isColumnEndValid:
      endOp(position.columnEnd, position.columnStart) &&
      (!checkBounds || position.columnEnd <= maxCol),
    isRowStartValid:
      position.rowStart >= 1 && endOp(position.rowEnd, position.rowStart),
    isRowEndValid:
      endOp(position.rowEnd, position.rowStart) &&
      (!checkBounds || position.rowEnd <= maxRow),
  };
  return result;
};

type GridPositionInputsProps = {
  value: GridPosition;
  onChange: (value: GridPosition) => void;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  gridColumns: number;
  gridRows: number;
  checkBounds?: boolean;
  /**
   * When true, "end" values are inclusive track indices (1-based)
   * instead of exclusive grid-line numbers.
   * Validation uses end >= start instead of end > start.
   */
  inclusiveEnd?: boolean;
};

const PositionInputGroup = ({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  onBlur,
  onKeyDown,
  isStartValid,
  isEndValid,
  minStart,
  maxStart,
  minEnd,
  maxEnd,
  label,
}: {
  startValue: number;
  endValue: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  onBlur?: () => void;
  isStartValid: boolean;
  isEndValid: boolean;
  minStart: number;
  maxStart: number;
  minEnd: number;
  maxEnd: number;
  label: string;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}) => (
  <Flex direction="column" gap="1" css={{ flex: 1 }}>
    <Grid css={{ gridTemplateColumns: "1fr 1fr", gap: theme.spacing[3] }}>
      <InputField
        type="number"
        value={String(startValue)}
        onChange={(event) => {
          const num = Number(event.target.value);
          if (!isNaN(num)) {
            onStartChange(num);
          }
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        color={isStartValid ? undefined : "error"}
        min={minStart}
        max={maxStart}
      />
      <InputField
        type="number"
        value={String(endValue)}
        onChange={(event) => {
          const num = Number(event.target.value);
          if (!isNaN(num)) {
            onEndChange(num);
          }
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        color={isEndValid ? undefined : "error"}
        min={minEnd}
        max={maxEnd}
      />
    </Grid>
    <Text variant="small" color="subtle">
      {label}
    </Text>
  </Flex>
);

export const GridPositionInputs = ({
  value,
  onChange,
  onBlur,
  onKeyDown,
  gridColumns,
  gridRows,
  checkBounds = false,
  inclusiveEnd = false,
}: GridPositionInputsProps) => {
  const validation = validateGridPosition(value, gridColumns, gridRows, {
    checkBounds,
    inclusiveEnd,
  });

  const colMaxEnd = inclusiveEnd ? gridColumns : gridColumns + 1;
  const rowMaxEnd = inclusiveEnd ? gridRows : gridRows + 1;
  const minEnd = inclusiveEnd ? 1 : 2;

  return (
    <Flex gap="2">
      <PositionInputGroup
        startValue={value.columnStart}
        endValue={value.columnEnd}
        onStartChange={(columnStart) => onChange({ ...value, columnStart })}
        onEndChange={(columnEnd) => onChange({ ...value, columnEnd })}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        isStartValid={validation.isColumnStartValid}
        isEndValid={validation.isColumnEndValid}
        minStart={1}
        maxStart={gridColumns}
        minEnd={minEnd}
        maxEnd={colMaxEnd}
        label="Column: start/end"
      />
      <PositionInputGroup
        startValue={value.rowStart}
        endValue={value.rowEnd}
        onStartChange={(rowStart) => onChange({ ...value, rowStart })}
        onEndChange={(rowEnd) => onChange({ ...value, rowEnd })}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        isStartValid={validation.isRowStartValid}
        isEndValid={validation.isRowEndValid}
        minStart={1}
        maxStart={gridRows}
        minEnd={minEnd}
        maxEnd={rowMaxEnd}
        label="Row: start/end"
      />
    </Flex>
  );
};
