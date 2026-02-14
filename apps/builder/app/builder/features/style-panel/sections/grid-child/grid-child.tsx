import { useState, useMemo } from "react";
import {
  Box,
  Flex,
  Grid,
  Select,
  Text,
  theme,
  ToggleGroup,
  ToggleGroupButton,
  SectionTitleButton,
  Tooltip,
} from "@webstudio-is/design-system";
import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import { toValue } from "@webstudio-is/css-engine";
import { StyleSection } from "../../shared/style-section";
import { PropertyLabel } from "../../property-label";
import { ToggleGroupTooltip } from "../../controls/toggle-group/toggle-group-control";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import {
  useComputedStyleDecl,
  useComputedStyles,
  useParentComputedStyleDecl,
} from "../../shared/model";
import { createBatchUpdate, deleteProperty } from "../../shared/use-style-data";
import {
  parseGridAreas,
  getGridDimensions,
} from "../layout/shared/grid-areas.utils";
import {
  GridPositionInputs,
  type GridPosition,
} from "../layout/shared/grid-position-inputs";
import { useLocalValue } from "../../../settings-panel/shared";
import { AlignSelfControl, JustifySelfControl } from "../shared/align-self";
import { OrderControl } from "../shared/order";
import { useStore } from "@nanostores/react";
import { $selectedInstancePath, selectInstance } from "~/shared/awareness";
import { ExternalLinkIcon } from "@webstudio-is/icons";

export const properties = [
  "grid-column-start",
  "grid-column-end",
  "grid-row-start",
  "grid-row-end",
  "align-self",
  "justify-self",
  "order",
] satisfies [CssProperty, ...CssProperty[]];

type PositionMode = "auto" | "area" | "manual";

export const Section = () => {
  const [positionMode, setPositionMode] = useState<PositionMode>("auto");
  const [columnStart, columnEnd, rowStart, rowEnd] = useComputedStyles([
    "grid-column-start",
    "grid-column-end",
    "grid-row-start",
    "grid-row-end",
  ]);

  const handleModeChange = (newMode: PositionMode) => {
    const hasKeywordValues =
      columnStart.cascadedValue.type === "keyword" &&
      columnEnd.cascadedValue.type === "keyword" &&
      rowStart.cascadedValue.type === "keyword" &&
      rowEnd.cascadedValue.type === "keyword";

    const batch = createBatchUpdate();

    if (newMode === "auto") {
      // Always reset to auto placement when switching to auto mode
      batch.setProperty("grid-column-start")({
        type: "keyword",
        value: "auto",
      });
      batch.setProperty("grid-column-end")({ type: "keyword", value: "auto" });
      batch.setProperty("grid-row-start")({ type: "keyword", value: "auto" });
      batch.setProperty("grid-row-end")({ type: "keyword", value: "auto" });
      batch.publish();
    } else if (newMode === "manual" && hasKeywordValues) {
      // Convert keywords to numeric positions when switching to manual
      batch.setProperty("grid-column-start")({
        type: "unit",
        value: 1,
        unit: "number",
      });
      batch.setProperty("grid-column-end")({
        type: "unit",
        value: 2,
        unit: "number",
      });
      batch.setProperty("grid-row-start")({
        type: "unit",
        value: 1,
        unit: "number",
      });
      batch.setProperty("grid-row-end")({
        type: "unit",
        value: 2,
        unit: "number",
      });
      batch.publish();
    }

    setPositionMode(newMode);
  };

  const instancePath = useStore($selectedInstancePath);
  // Get the parent instance (second item in the path, index 1)
  const parentInstance = instancePath?.[1];

  return (
    <StyleSection
      label="Grid child"
      properties={properties}
      suffix={
        parentInstance && (
          <Tooltip content="Select grid container">
            <SectionTitleButton
              prefix={<ExternalLinkIcon />}
              onClick={() => selectInstance(parentInstance.instanceSelector)}
            />
          </Tooltip>
        )
      }
    >
      <Flex css={{ flexDirection: "column", gap: theme.spacing[5] }}>
        <GridChildPositionMode
          value={positionMode}
          onChange={handleModeChange}
        />
        {positionMode === "auto" && <GridChildPositionAuto />}
        {positionMode === "area" && <GridChildPositionArea />}
        {positionMode === "manual" && <GridChildPositionManual />}
        <GridChildAlign />
      </Flex>
    </StyleSection>
  );
};

const GridChildPositionMode = ({
  value,
  onChange,
}: {
  value: PositionMode;
  onChange: (value: PositionMode) => void;
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | undefined>();

  const items = [
    {
      value: "auto" as const,
      label: "Auto",
      description: "Let the grid automatically place this item.",
      code: "grid-column: auto;\ngrid-row: auto;",
    },
    {
      value: "area" as const,
      label: "Area",
      description: "Place the item in a named grid area.",
      code: "grid-area: <area-name>;",
    },
    {
      value: "manual" as const,
      label: "Manual",
      description: "Manually specify the item's position using grid lines.",
      code: "grid-column: <start> / <end>;\ngrid-row: <start> / <end>;",
    },
  ];

  return (
    <Grid css={{ gridTemplateColumns: "3fr 8fr" }}>
      <PropertyLabel
        label="Position"
        description="How the grid item is positioned within the grid"
        properties={[
          "grid-column-start",
          "grid-column-end",
          "grid-row-start",
          "grid-row-end",
        ]}
      />
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(newValue) => {
          if (newValue) {
            onChange(newValue as PositionMode);
          }
        }}
      >
        {items.map((item) => (
          <ToggleGroupTooltip
            key={item.value}
            isOpen={item.value === activeTooltip}
            onOpenChange={(isOpen) =>
              setActiveTooltip(isOpen ? item.value : undefined)
            }
            isSelected={item.value === value}
            label={item.label}
            code={item.code}
            description={item.description}
            properties={["grid-column-start", "grid-row-start"]}
          >
            <ToggleGroupButton
              value={item.value}
              onMouseEnter={() =>
                setActiveTooltip((prevValue) =>
                  prevValue === item.value ? prevValue : undefined
                )
              }
            >
              <Box css={{ paddingInline: theme.spacing[4] }}>{item.label}</Box>
            </ToggleGroupButton>
          </ToggleGroupTooltip>
        ))}
      </ToggleGroup>
    </Grid>
  );
};

const GridChildPositionAuto = () => {
  return (
    <Grid css={{ gridTemplateColumns: "3fr 8fr" }}>
      <div />
      <Grid css={{ gridTemplateColumns: "1fr 1fr", gap: theme.spacing[5] }}>
        <Grid css={{ gap: theme.spacing[3] }}>
          <SpanInput
            property="grid-column-end"
            startProperty="grid-column-start"
          />
          <Text variant="small" color="subtle">
            Column span
          </Text>
        </Grid>
        <Grid css={{ gap: theme.spacing[3] }}>
          <SpanInput property="grid-row-end" startProperty="grid-row-start" />
          <Text variant="small" color="subtle">
            Row span
          </Text>
        </Grid>
      </Grid>
    </Grid>
  );
};

/**
 * A specialized input for grid span values.
 * Handles conversion between span values and the number displayed.
 * When span is 1, grid uses "auto". For span > 1, uses "span N".
 */
const SpanInput = ({
  property,
  startProperty,
}: {
  property: "grid-column-end" | "grid-row-end";
  startProperty: "grid-column-start" | "grid-row-start";
}) => {
  const computedStyleDecl = useComputedStyleDecl(property);
  const value = computedStyleDecl.cascadedValue;
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  // Extract span number from value
  // "auto" = 1, "span 2" = 2, etc.
  const getSpanNumber = (styleValue: StyleValue): number => {
    if (styleValue.type === "keyword" && styleValue.value === "auto") {
      return 1;
    }
    if (styleValue.type === "tuple" && styleValue.value.length === 2) {
      const spanKeyword = styleValue.value[0];
      const spanNumber = styleValue.value[1];
      if (
        spanKeyword.type === "keyword" &&
        spanKeyword.value === "span" &&
        spanNumber.type === "unit" &&
        spanNumber.unit === "number"
      ) {
        return spanNumber.value;
      }
    }
    if (styleValue.type === "unit" && styleValue.unit === "number") {
      return styleValue.value;
    }
    return 1;
  };

  // Create span StyleValue from number
  const createSpanValue = (num: number): StyleValue => {
    if (num <= 1) {
      return { type: "keyword", value: "auto" };
    }
    return {
      type: "tuple",
      value: [
        { type: "keyword", value: "span" },
        { type: "unit", value: num, unit: "number" },
      ],
    };
  };

  const currentSpan = getSpanNumber(value);

  // Display the span number as a simple unit value for the input
  const displayValue: StyleValue = {
    type: "unit",
    value: currentSpan,
    unit: "number",
  };

  const handleChange = (styleValue: StyleValue | undefined) => {
    if (styleValue === undefined) {
      deleteProperty(property, { isEphemeral: true });
      // Also ensure start is auto for auto placement
      const batch = createBatchUpdate();
      batch.deleteProperty(startProperty);
      batch.publish({ isEphemeral: true });
      return;
    }

    if (styleValue.type === "unit" && styleValue.unit === "number") {
      const spanValue = createSpanValue(
        Math.max(1, Math.round(styleValue.value))
      );
      const batch = createBatchUpdate();
      // Set start to auto for auto placement mode
      batch.setProperty(startProperty)({ type: "keyword", value: "auto" });
      batch.setProperty(property)(spanValue);
      batch.publish({ isEphemeral: true });
    }
  };

  const handleChangeComplete = (styleValue: StyleValue) => {
    setIntermediateValue(undefined);
    if (styleValue.type === "unit" && styleValue.unit === "number") {
      const spanValue = createSpanValue(
        Math.max(1, Math.round(styleValue.value))
      );
      const batch = createBatchUpdate();
      batch.setProperty(startProperty)({ type: "keyword", value: "auto" });
      batch.setProperty(property)(spanValue);
      batch.publish();
    }
  };

  return (
    <CssValueInput
      styleSource={computedStyleDecl.source.name}
      property={property}
      value={displayValue}
      intermediateValue={intermediateValue}
      getOptions={() => []}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);
        if (styleValue === undefined) {
          handleChange(undefined);
          return;
        }
        if (styleValue.type !== "intermediate") {
          handleChange(styleValue);
        }
      }}
      onHighlight={(styleValue) => {
        if (styleValue !== undefined) {
          handleChange(styleValue);
        } else {
          deleteProperty(property, { isEphemeral: true });
        }
      }}
      onChangeComplete={({ value }) => {
        handleChangeComplete(value);
      }}
      onAbort={() => {
        deleteProperty(property, { isEphemeral: true });
      }}
      onReset={() => {
        setIntermediateValue(undefined);
        const batch = createBatchUpdate();
        batch.deleteProperty(startProperty);
        batch.deleteProperty(property);
        batch.publish();
      }}
    />
  );
};

const GridChildPositionArea = () => {
  const parentGridTemplateAreas = useParentComputedStyleDecl(
    "grid-template-areas"
  );
  const gridRowStart = useComputedStyleDecl("grid-row-start");

  // Parse area names from parent's grid-template-areas
  const areasValue = toValue(parentGridTemplateAreas.computedValue);
  const areas = parseGridAreas(areasValue);
  const areaNames = areas.map((area) => area.name);

  // Get current area name from grid-row-start
  // When using named areas, grid-row-start contains the area name
  const currentValue = toValue(gridRowStart.cascadedValue);
  const selectedArea = areaNames.includes(currentValue) ? currentValue : "";

  const handleAreaChange = (areaName: string) => {
    const batch = createBatchUpdate();
    // Setting all four properties to the same area name places the item in that area
    const areaValue: StyleValue = { type: "keyword", value: areaName };
    batch.setProperty("grid-row-start")(areaValue);
    batch.setProperty("grid-column-start")(areaValue);
    batch.setProperty("grid-row-end")(areaValue);
    batch.setProperty("grid-column-end")(areaValue);
    batch.publish();
  };

  if (areaNames.length === 0) {
    return (
      <Text color="moreSubtle">
        No named areas defined. Add areas in the parent grid's template.
      </Text>
    );
  }

  return (
    <Grid css={{ gridTemplateColumns: "3fr 8fr" }}>
      <div />
      <Select
        options={areaNames}
        value={selectedArea}
        onChange={handleAreaChange}
        placeholder="Select area"
      />
    </Grid>
  );
};

const GridChildPositionManual = () => {
  const parentGridTemplateColumns = useParentComputedStyleDecl(
    "grid-template-columns"
  );
  const parentGridTemplateRows =
    useParentComputedStyleDecl("grid-template-rows");
  const [columnStart, columnEnd, rowStart, rowEnd] = useComputedStyles([
    "grid-column-start",
    "grid-column-end",
    "grid-row-start",
    "grid-row-end",
  ]);

  // Get grid dimensions from parent
  const { columns: gridColumns, rows: gridRows } = getGridDimensions(
    toValue(parentGridTemplateColumns.computedValue),
    toValue(parentGridTemplateRows.computedValue)
  );

  // Extract numeric values from CSS values
  // For "auto" or non-numeric values, use sensible defaults based on position type
  const getNumericValue = (
    styleValue: StyleValue,
    defaultValue: number
  ): number => {
    if (styleValue.type === "unit" && styleValue.unit === "number") {
      return styleValue.value;
    }
    return defaultValue;
  };

  // Get values with defaults, ensuring they form a valid position
  const colStart = getNumericValue(columnStart.cascadedValue, 1);
  const colEnd = getNumericValue(columnEnd.cascadedValue, 2);
  const rStart = getNumericValue(rowStart.cascadedValue, 1);
  const rEnd = getNumericValue(rowEnd.cascadedValue, 2);

  // Validate and fix invalid positions (end must be greater than start)
  // Use useMemo to stabilize the position object so it doesn't change on every render
  const position: GridPosition = useMemo(
    () => ({
      columnStart: colStart,
      columnEnd: colEnd > colStart ? colEnd : colStart + 1,
      rowStart: rStart,
      rowEnd: rEnd > rStart ? rEnd : rStart + 1,
    }),
    [colStart, colEnd, rStart, rEnd]
  );

  const localValue = useLocalValue(
    position,
    (newPosition) => {
      // Validate and fix the position before saving
      const validPosition = {
        columnStart: Math.max(1, Math.round(newPosition.columnStart)),
        columnEnd: Math.max(1, Math.round(newPosition.columnEnd)),
        rowStart: Math.max(1, Math.round(newPosition.rowStart)),
        rowEnd: Math.max(1, Math.round(newPosition.rowEnd)),
      };

      // Ensure end is greater than start
      if (validPosition.columnEnd <= validPosition.columnStart) {
        validPosition.columnEnd = validPosition.columnStart + 1;
      }
      if (validPosition.rowEnd <= validPosition.rowStart) {
        validPosition.rowEnd = validPosition.rowStart + 1;
      }

      const batch = createBatchUpdate();
      batch.setProperty("grid-column-start")({
        type: "unit",
        value: validPosition.columnStart,
        unit: "number",
      });
      batch.setProperty("grid-column-end")({
        type: "unit",
        value: validPosition.columnEnd,
        unit: "number",
      });
      batch.setProperty("grid-row-start")({
        type: "unit",
        value: validPosition.rowStart,
        unit: "number",
      });
      batch.setProperty("grid-row-end")({
        type: "unit",
        value: validPosition.rowEnd,
        unit: "number",
      });
      batch.publish();
    },
    { autoSave: false }
  );

  const handleChange = (newPosition: GridPosition) => {
    localValue.set(newPosition);
    const batch = createBatchUpdate();
    batch.setProperty("grid-column-start")({
      type: "unit",
      value: newPosition.columnStart,
      unit: "number",
    });
    batch.setProperty("grid-column-end")({
      type: "unit",
      value: newPosition.columnEnd,
      unit: "number",
    });
    batch.setProperty("grid-row-start")({
      type: "unit",
      value: newPosition.rowStart,
      unit: "number",
    });
    batch.setProperty("grid-row-end")({
      type: "unit",
      value: newPosition.rowEnd,
      unit: "number",
    });
    batch.publish({ isEphemeral: true });
  };

  return (
    <Grid
      css={{
        gridTemplateColumns: "3fr 8fr",
        alignItems: "start",
      }}
    >
      <div />
      <GridPositionInputs
        value={localValue.value}
        onChange={handleChange}
        onBlur={localValue.save}
        gridColumns={gridColumns}
        gridRows={gridRows}
      />
    </Grid>
  );
};

const GridChildAlign = () => {
  return (
    <Flex direction="column" gap="1">
      <AlignSelfControl variant="grid" />
      <JustifySelfControl />
      <OrderControl />
    </Flex>
  );
};
