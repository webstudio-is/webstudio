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
  gridRows: number
): GridPositionValidation => {
  return {
    isColumnStartValid:
      position.columnStart >= 1 && position.columnStart < position.columnEnd,
    isColumnEndValid:
      position.columnEnd > position.columnStart &&
      position.columnEnd <= gridColumns + 1,
    isRowStartValid:
      position.rowStart >= 1 && position.rowStart < position.rowEnd,
    isRowEndValid:
      position.rowEnd > position.rowStart && position.rowEnd <= gridRows + 1,
  };
};

type GridPositionInputsProps = {
  value: GridPosition;
  onChange: (value: GridPosition) => void;
  onBlur?: () => void;
  gridColumns: number;
  gridRows: number;
};

export const GridPositionInputs = ({
  value,
  onChange,
  onBlur,
  gridColumns,
  gridRows,
}: GridPositionInputsProps) => {
  const validation = validateGridPosition(value, gridColumns, gridRows);

  return (
    <Flex gap="2">
      <Flex direction="column" gap="1">
        <Grid css={{ gridTemplateColumns: "1fr 1fr", gap: theme.spacing[3] }}>
          <InputField
            type="number"
            value={String(value.columnStart)}
            onChange={(event) => {
              const newValue = Number(event.target.value);
              if (!isNaN(newValue)) {
                onChange({ ...value, columnStart: newValue });
              }
            }}
            onBlur={onBlur}
            color={validation.isColumnStartValid ? undefined : "error"}
            min={1}
            max={gridColumns}
          />
          <InputField
            type="number"
            value={String(value.columnEnd)}
            onChange={(event) => {
              const newValue = Number(event.target.value);
              if (!isNaN(newValue)) {
                onChange({ ...value, columnEnd: newValue });
              }
            }}
            onBlur={onBlur}
            color={validation.isColumnEndValid ? undefined : "error"}
            min={2}
            max={gridColumns + 1}
          />
        </Grid>
        <Text variant="labels" color="subtle">
          Column: start / end
        </Text>
      </Flex>
      <Flex direction="column" gap="1">
        <Grid css={{ gridTemplateColumns: "1fr 1fr", gap: theme.spacing[3] }}>
          <InputField
            type="number"
            value={String(value.rowStart)}
            onChange={(event) => {
              const newValue = Number(event.target.value);
              if (!isNaN(newValue)) {
                onChange({ ...value, rowStart: newValue });
              }
            }}
            onBlur={onBlur}
            color={validation.isRowStartValid ? undefined : "error"}
            min={1}
            max={gridRows}
          />
          <InputField
            type="number"
            value={String(value.rowEnd)}
            onChange={(event) => {
              const newValue = Number(event.target.value);
              if (!isNaN(newValue)) {
                onChange({ ...value, rowEnd: newValue });
              }
            }}
            onBlur={onBlur}
            color={validation.isRowEndValid ? undefined : "error"}
            min={2}
            max={gridRows + 1}
          />
        </Grid>
        <Text variant="labels" color="subtle">
          Row: start / end
        </Text>
      </Flex>
    </Flex>
  );
};
