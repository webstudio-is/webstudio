import { useState, useCallback, useEffect } from "react";
import {
  theme,
  Flex,
  Text,
  IconButton,
  FloatingPanel,
  Label,
  InputField,
  Grid,
} from "@webstudio-is/design-system";
import { PlusIcon, MinusIcon } from "@webstudio-is/icons";
import { toValue } from "@webstudio-is/css-engine";
import { lexer } from "css-tree";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { useComputedStyleDecl } from "../../../shared/model";
import { createBatchUpdate } from "../../../shared/use-style-data";
import {
  type AreaInfo,
  parseGridAreas,
  generateGridTemplate,
  getGridDimensions,
  checkOverlap,
  findNonOverlappingPosition,
  isAreaWithinBounds,
  filterAreasWithinBounds,
} from "./grid-areas.utils";

type AreaEditorProps = {
  area: AreaInfo | undefined;
  editingIndex: number | undefined;
  gridColumns: number;
  gridRows: number;
  existingAreas: AreaInfo[];
  onSave: (area: AreaInfo, oldName?: string) => void;
  onClose: () => void;
};

const AreaEditor = ({
  area,
  editingIndex,
  gridColumns,
  gridRows,
  existingAreas,
  onSave,
  onClose,
}: AreaEditorProps) => {
  const [value, setValue] = useState<AreaInfo>(
    area || {
      name: "Area",
      columnStart: 1,
      columnEnd: gridColumns + 1,
      rowStart: 1,
      rowEnd: gridRows + 1,
    }
  );

  const handleSave = useCallback(() => {
    const trimmedName = value.name.trim() || "Area";

    // Validate CSS identifier using css-tree lexer
    if (!lexer.match("<custom-ident>", trimmedName).matched) {
      return;
    }

    // Filter out the area being edited from validation using index
    const otherAreas =
      editingIndex !== undefined
        ? existingAreas.filter((_, index) => index !== editingIndex)
        : existingAreas;

    // Check for duplicate names
    const hasDuplicateName = otherAreas.some(
      (existingArea) => existingArea.name === trimmedName
    );

    if (hasDuplicateName) {
      return;
    }

    // Validate bounds
    if (!isAreaWithinBounds(value, gridColumns, gridRows)) {
      return;
    }

    // Check for overlaps with other areas
    const hasOverlap = otherAreas.some((existingArea) =>
      checkOverlap(value, existingArea)
    );

    if (hasOverlap) {
      return;
    }

    onSave(
      {
        ...value,
        name: trimmedName,
      },
      area?.name
    );
  }, [value, area, existingAreas, onSave, editingIndex, gridColumns, gridRows]);

  const isColumnStartValid =
    value.columnStart >= 1 && value.columnStart < value.columnEnd;
  const isColumnEndValid =
    value.columnEnd > value.columnStart && value.columnEnd <= gridColumns + 1;
  const isRowStartValid = value.rowStart >= 1 && value.rowStart < value.rowEnd;
  const isRowEndValid =
    value.rowEnd > value.rowStart && value.rowEnd <= gridRows + 1;

  // Check for duplicate names
  const trimmedName = value.name.trim();
  // Filter out the area being edited from the comparison using index
  const otherAreas =
    editingIndex !== undefined
      ? existingAreas.filter((_, index) => index !== editingIndex)
      : existingAreas;

  const hasDuplicateName =
    trimmedName !== "" &&
    trimmedName !== area?.name && // Don't show error if name hasn't changed
    otherAreas.some((existingArea) => existingArea.name === trimmedName);

  // Check for overlaps with other areas
  const hasOverlap = otherAreas.some((existingArea) =>
    checkOverlap(value, existingArea)
  );

  return (
    <Flex direction="column" gap="2" css={{ padding: theme.panel.padding }}>
      <Grid
        css={{
          gridTemplateColumns: "60px 1fr 1fr",
          gap: theme.spacing[3],
          alignItems: "center",
        }}
      >
        <Label>Name</Label>
        <InputField
          css={{ gridColumn: "span 2" }}
          value={value.name}
          onChange={(event) => setValue({ ...value, name: event.target.value })}
          onBlur={handleSave}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onClose();
            } else if (event.key === "Enter") {
              handleSave();
            }
          }}
          color={hasDuplicateName ? "error" : undefined}
          placeholder="Area"
          autoFocus
        />
      </Grid>

      <Grid
        css={{
          gridTemplateColumns: "60px 1fr",
          gap: theme.spacing[3],
          alignItems: "start",
        }}
      >
        <Label css={{ paddingTop: theme.spacing[3] }}>Position</Label>
        <Flex gap="2">
          <Flex direction="column" gap="1">
            <Grid
              css={{
                gridTemplateColumns: "1fr 1fr",
                gap: theme.spacing[3],
              }}
            >
              <InputField
                type="number"
                value={String(value.columnStart)}
                onChange={(event) => {
                  const newValue = Number(event.target.value);
                  if (!isNaN(newValue)) {
                    setValue({ ...value, columnStart: newValue });
                  }
                }}
                onBlur={handleSave}
                color={isColumnStartValid ? undefined : "error"}
                min={1}
                max={gridColumns}
              />
              <InputField
                type="number"
                value={String(value.columnEnd)}
                onChange={(event) => {
                  const newValue = Number(event.target.value);
                  if (!isNaN(newValue)) {
                    setValue({ ...value, columnEnd: newValue });
                  }
                }}
                onBlur={handleSave}
                color={isColumnEndValid ? undefined : "error"}
                min={2}
                max={gridColumns + 1}
              />
            </Grid>
            <Text variant="labelsSentenceCase" color="subtle">
              Column: start/end
            </Text>
          </Flex>
          <Flex direction="column" gap="1">
            <Grid
              css={{
                gridTemplateColumns: "1fr 1fr",
                gap: theme.spacing[3],
              }}
            >
              <InputField
                type="number"
                value={String(value.rowStart)}
                onChange={(event) => {
                  const newValue = Number(event.target.value);
                  if (!isNaN(newValue)) {
                    setValue({ ...value, rowStart: newValue });
                  }
                }}
                onBlur={handleSave}
                color={isRowStartValid ? undefined : "error"}
                min={1}
                max={gridRows}
              />
              <InputField
                type="number"
                value={String(value.rowEnd)}
                onChange={(event) => {
                  const newValue = Number(event.target.value);
                  if (!isNaN(newValue)) {
                    setValue({ ...value, rowEnd: newValue });
                  }
                }}
                onBlur={handleSave}
                color={isRowEndValid ? undefined : "error"}
                min={2}
                max={gridRows + 1}
              />
            </Grid>
            <Text variant="labelsSentenceCase" color="subtle">
              Row: start/end
            </Text>
          </Flex>
        </Flex>
      </Grid>
      {hasDuplicateName && (
        <Text variant="labelsSentenceCase" color="destructive">
          Area name already exists
        </Text>
      )}
      {hasOverlap && (
        <Text variant="labelsSentenceCase" color="destructive">
          Area overlaps with another area
        </Text>
      )}
    </Flex>
  );
};

export const GridAreas = () => {
  const [isOpen, setIsOpen] = useOpenState("Areas");
  const [editingAreaIndex, setEditingAreaIndex] = useState<number | undefined>(
    undefined
  );

  const gridTemplateAreas = useComputedStyleDecl("grid-template-areas");
  const gridTemplateColumns = useComputedStyleDecl("grid-template-columns");
  const gridTemplateRows = useComputedStyleDecl("grid-template-rows");

  const areasValue = toValue(gridTemplateAreas.cascadedValue);
  const columnsValue = toValue(gridTemplateColumns.cascadedValue);
  const rowsValue = toValue(gridTemplateRows.cascadedValue);

  const areas = parseGridAreas(areasValue);
  const { columns, rows } = getGridDimensions(columnsValue, rowsValue);

  const editingArea =
    editingAreaIndex !== undefined ? areas[editingAreaIndex] : undefined;

  const saveArea = useCallback(
    (newArea: AreaInfo, oldName?: string) => {
      const batch = createBatchUpdate();

      let updatedAreas = [...areas];

      // Check if oldName exists in current areas
      const isUpdate = oldName && areas.some((a) => a.name === oldName);

      if (isUpdate) {
        // Update existing area
        updatedAreas = updatedAreas.map((a) =>
          a.name === oldName ? newArea : a
        );
      } else {
        // Add new area
        updatedAreas.push(newArea);
      }

      // Filter out areas that are out of bounds
      const validAreas = filterAreasWithinBounds(updatedAreas, columns, rows);

      const template = generateGridTemplate(validAreas, columns, rows);
      batch.setProperty("grid-template-areas")({
        type: "unparsed",
        value: template,
      });
      batch.publish();
    },
    [areas, columns, rows]
  );

  const removeArea = useCallback(
    (areaName: string) => {
      const batch = createBatchUpdate();
      const remainingAreas = areas.filter((a) => a.name !== areaName);

      if (remainingAreas.length === 0) {
        batch.setProperty("grid-template-areas")({
          type: "keyword",
          value: "none",
        });
      } else {
        const template = generateGridTemplate(remainingAreas, columns, rows);
        batch.setProperty("grid-template-areas")({
          type: "unparsed",
          value: template,
        });
      }
      batch.publish();
    },
    [areas, columns, rows]
  );

  // Clean up areas that are out of bounds when grid dimensions change
  useEffect(() => {
    // Only run if there are areas and dimensions are valid
    if (areas.length === 0 || columns === 0 || rows === 0) {
      return;
    }

    const validAreas = filterAreasWithinBounds(areas, columns, rows);

    // If some areas are invalid, update the grid-template-areas
    if (validAreas.length < areas.length) {
      const batch = createBatchUpdate();

      if (validAreas.length === 0) {
        batch.setProperty("grid-template-areas")({
          type: "keyword",
          value: "none",
        });
      } else {
        const template = generateGridTemplate(validAreas, columns, rows);
        batch.setProperty("grid-template-areas")({
          type: "unparsed",
          value: template,
        });
      }

      batch.publish();
    }
  }, [columns, rows, areas]);

  return (
    <CollapsibleSectionRoot
      label={`Areas (${areas.length})`}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <Flex
          align="center"
          justify="between"
          css={{ padding: theme.spacing[5] }}
        >
          <Text variant="labelsSentenceCase" color="subtle">
            Areas ({areas.length})
          </Text>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              const { area: newArea, needsNewRow } = findNonOverlappingPosition(
                areas,
                columns,
                rows
              );

              const batch = createBatchUpdate();

              // Calculate actual dimensions after potential row addition
              let actualRows = rows;

              // If we need a new row, add it to the grid
              if (needsNewRow) {
                const currentRows = rowsValue.split(/\s+/).filter(Boolean);
                const lastRowSize =
                  currentRows[currentRows.length - 1] || "1fr";
                const updatedRows = [...currentRows, lastRowSize].join(" ");
                batch.setProperty("grid-template-rows")({
                  type: "unparsed",
                  value: updatedRows,
                });
                actualRows = rows + 1; // Use the new row count
              }

              // Add the new area to the grid
              const updatedAreas = [...areas, newArea];
              const template = generateGridTemplate(
                updatedAreas,
                columns,
                actualRows // Use actualRows instead of stale rows
              );
              batch.setProperty("grid-template-areas")({
                type: "unparsed",
                value: template,
              });
              batch.publish();

              // Now open the dialog to edit the newly created area
              setEditingAreaIndex(areas.length);
            }}
          >
            <PlusIcon />
          </IconButton>
        </Flex>
      }
    >
      <Flex direction="column" gap="2">
        {areas.length === 0 && (
          <Text
            color="subtle"
            align="center"
            css={{ padding: theme.spacing[5] }}
          >
            No Areas
          </Text>
        )}
        {areas.map((area, index) => (
          <Grid
            key={area.name}
            gap="2"
            css={{
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              cursor: "pointer",
              "&:hover": {
                backgroundColor: theme.colors.backgroundHover,
              },
            }}
            onClick={() => setEditingAreaIndex(index)}
          >
            <Text color="subtle" css={{ textAlign: "center" }}>
              {index + 1}
            </Text>
            <Text>
              {area.name} Row {area.rowStart} / Col {area.columnStart}
            </Text>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                removeArea(area.name);
              }}
              css={{ minWidth: "auto" }}
            >
              <MinusIcon />
            </IconButton>
          </Grid>
        ))}
      </Flex>

      {editingArea && (
        <FloatingPanel
          placement="bottom-within"
          title={
            editingAreaIndex !== undefined && editingAreaIndex < areas.length
              ? "Edit Area"
              : "New Area"
          }
          content={
            <AreaEditor
              key={editingAreaIndex}
              area={editingArea}
              editingIndex={editingAreaIndex}
              gridColumns={columns}
              gridRows={rows}
              existingAreas={areas}
              onSave={saveArea}
              onClose={() => setEditingAreaIndex(undefined)}
            />
          }
          open={editingAreaIndex !== undefined}
          onOpenChange={(open) => {
            if (!open) {
              setEditingAreaIndex(undefined);
            }
          }}
        >
          <div />
        </FloatingPanel>
      )}
    </CollapsibleSectionRoot>
  );
};
