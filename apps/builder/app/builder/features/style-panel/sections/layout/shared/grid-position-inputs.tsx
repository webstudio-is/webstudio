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
  options: { checkBounds?: boolean } = {}
): GridPositionValidation => {
  const { checkBounds = false } = options;
  const result = {
    // Start must be >= 1 and strictly less than end
    isColumnStartValid:
      position.columnStart >= 1 && position.columnStart < position.columnEnd,
    // End must be greater than start, optionally within grid bounds
    isColumnEndValid:
      position.columnEnd > position.columnStart &&
      (!checkBounds || position.columnEnd <= gridColumns + 1),
    isRowStartValid:
      position.rowStart >= 1 && position.rowStart < position.rowEnd,
    isRowEndValid:
      position.rowEnd > position.rowStart &&
      (!checkBounds || position.rowEnd <= gridRows + 1),
  };
  return result;
};

type GridPositionInputsProps = {
  value: GridPosition;
  onChange: (value: GridPosition) => void;
  onBlur?: () => void;
  gridColumns: number;
  gridRows: number;
  checkBounds?: boolean;
};

const PositionInputGroup = ({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  onBlur,
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
  gridColumns,
  gridRows,
  checkBounds = false,
}: GridPositionInputsProps) => {
  const validation = validateGridPosition(value, gridColumns, gridRows, {
    checkBounds,
  });

  return (
    <Flex gap="2">
      <PositionInputGroup
        startValue={value.columnStart}
        endValue={value.columnEnd}
        onStartChange={(columnStart) => onChange({ ...value, columnStart })}
        onEndChange={(columnEnd) => onChange({ ...value, columnEnd })}
        onBlur={onBlur}
        isStartValid={validation.isColumnStartValid}
        isEndValid={validation.isColumnEndValid}
        minStart={1}
        maxStart={gridColumns}
        minEnd={2}
        maxEnd={gridColumns + 1}
        label="Column: start/end"
      />
      <PositionInputGroup
        startValue={value.rowStart}
        endValue={value.rowEnd}
        onStartChange={(rowStart) => onChange({ ...value, rowStart })}
        onEndChange={(rowEnd) => onChange({ ...value, rowEnd })}
        onBlur={onBlur}
        isStartValid={validation.isRowStartValid}
        isEndValid={validation.isRowEndValid}
        minStart={1}
        maxStart={gridRows}
        minEnd={2}
        maxEnd={gridRows + 1}
        label="Row: start/end"
      />
    </Flex>
  );
};
