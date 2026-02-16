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
  CssValueListItem,
  CssValueListArrowFocus,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { PlusIcon, MinusIcon } from "@webstudio-is/icons";
import { toValue } from "@webstudio-is/css-engine";
import { lexer } from "css-tree";
import { parseGridTemplateTrackList } from "@webstudio-is/css-data";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { useComputedStyleDecl } from "../../../shared/model";
import { createBatchUpdate } from "../../../shared/use-style-data";
import { GridPositionInputs } from "./grid-position-inputs";

export type AreaInfo = {
  name: string;
  columnStart: number;
  columnEnd: number;
  rowStart: number;
  rowEnd: number;
};

/**
 * Parse grid-template-areas CSS string into structured area information
 * @example
 * parseGridAreas('"header header" "sidebar main"')
 * // Returns: [
 * //   { name: 'header', columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 },
 * //   { name: 'sidebar', columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
 * //   { name: 'main', columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 }
 * // ]
 */
export const parseGridAreas = (value: string): AreaInfo[] => {
  if (!value || value === "none") {
    return [];
  }

  const areaMap = new Map<string, AreaInfo>();
  const rows = value.match(/"[^"]+"/g) || [];

  rows.forEach((row, rowIndex) => {
    const names = row.replace(/"/g, "").split(/\s+/).filter(Boolean);
    names.forEach((name, colIndex) => {
      if (name !== ".") {
        if (!areaMap.has(name)) {
          areaMap.set(name, {
            name,
            columnStart: colIndex + 1,
            columnEnd: colIndex + 2,
            rowStart: rowIndex + 1,
            rowEnd: rowIndex + 2,
          });
        } else {
          // Extend the area bounds
          const area = areaMap.get(name)!;
          area.columnEnd = Math.max(area.columnEnd, colIndex + 2);
          area.rowEnd = Math.max(area.rowEnd, rowIndex + 2);
        }
      }
    });
  });

  return Array.from(areaMap.values());
};

/**
 * Generate grid-template-areas CSS string from area information
 * @example
 * generateGridTemplate([
 *   { name: 'header', columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 }
 * ], 2, 2)
 * // Returns: '"header header" ". ."'
 */
const generateGridTemplate = (
  areas: AreaInfo[],
  columns: number,
  rows: number
): string => {
  // Create a 2D grid filled with dots
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array(columns).fill(".")
  );

  // Fill in each area
  areas.forEach((area) => {
    for (let r = area.rowStart - 1; r < area.rowEnd - 1; r++) {
      for (let c = area.columnStart - 1; c < area.columnEnd - 1; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < columns) {
          grid[r][c] = area.name;
        }
      }
    }
  });

  // Convert to CSS string format
  return grid.map((row) => `"${row.join(" ")}"`).join(" ");
};

/**
 * Get grid dimensions from template columns/rows CSS values
 * @example
 * getGridDimensions('1fr 2fr', '100px 200px 300px')
 * // Returns: { columns: 2, rows: 3 }
 */
export const getGridDimensions = (
  columnsValue: string,
  rowsValue: string
): { columns: number; rows: number } => {
  const columnTracks = parseGridTemplateTrackList(columnsValue);
  const rowTracks = parseGridTemplateTrackList(rowsValue);
  // Default to 2 if no tracks (for "none" or empty values)
  const columns = columnTracks.length || 2;
  const rows = rowTracks.length || 2;
  return { columns, rows };
};

/**
 * Check if two grid areas overlap
 * @example
 * checkOverlap(
 *   { name: 'a', columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 },
 *   { name: 'b', columnStart: 2, columnEnd: 4, rowStart: 1, rowEnd: 2 }
 * )
 * // Returns: true (they overlap in columns 2)
 */
const checkOverlap = (area1: AreaInfo, area2: AreaInfo): boolean => {
  return (
    area1.columnStart < area2.columnEnd &&
    area1.columnEnd > area2.columnStart &&
    area1.rowStart < area2.rowEnd &&
    area1.rowEnd > area2.rowStart
  );
};

/**
 * Generate a unique area name based on existing names
 * @example
 * generateUniqueAreaName(['Area', 'Area-1'])
 * // Returns: 'Area-2'
 */
const generateUniqueAreaName = (existingNames: string[]): string => {
  const baseName = "Area";
  const existingNamesSet = new Set(existingNames);

  if (!existingNamesSet.has(baseName)) {
    return baseName;
  }

  let counter = 1;
  while (existingNamesSet.has(`${baseName}-${counter}`)) {
    counter++;
  }
  return `${baseName}-${counter}`;
};

/**
 * Find a non-overlapping position for a new area in the grid
 * Returns the area with a unique name and whether a new row is needed
 * @example
 * findNonOverlappingPosition([], 2, 2)
 * // Returns: { area: { name: 'Area', columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 }, needsNewRow: false }
 */
const findNonOverlappingPosition = (
  existingAreas: AreaInfo[],
  gridColumns: number,
  gridRows: number
): { area: AreaInfo; needsNewRow: boolean } => {
  const uniqueName = generateUniqueAreaName(existingAreas.map((a) => a.name));

  // Try to find an empty cell in the existing grid
  for (let row = 1; row <= gridRows; row++) {
    for (let col = 1; col <= gridColumns; col++) {
      const testArea: AreaInfo = {
        name: uniqueName,
        columnStart: col,
        columnEnd: col + 1,
        rowStart: row,
        rowEnd: row + 1,
      };

      const hasOverlap = existingAreas.some((existing) =>
        checkOverlap(testArea, existing)
      );

      if (!hasOverlap) {
        return { area: testArea, needsNewRow: false };
      }
    }
  }

  // No empty cell found, need to add a new row
  return {
    area: {
      name: uniqueName,
      columnStart: 1,
      columnEnd: gridColumns + 1,
      rowStart: gridRows + 1,
      rowEnd: gridRows + 2,
    },
    needsNewRow: true,
  };
};

/**
 * Validate area bounds are within grid dimensions
 */
const isAreaWithinBounds = (
  area: AreaInfo,
  gridColumns: number,
  gridRows: number
): boolean => {
  return (
    area.columnStart >= 1 &&
    area.columnStart < area.columnEnd &&
    area.columnEnd <= gridColumns + 1 &&
    area.rowStart >= 1 &&
    area.rowStart < area.rowEnd &&
    area.rowEnd <= gridRows + 1
  );
};

/**
 * Filter out areas that don't fit within the grid dimensions
 * Used when grid dimensions change (rows/columns deleted)
 */
const filterAreasWithinBounds = (
  areas: AreaInfo[],
  gridColumns: number,
  gridRows: number
): AreaInfo[] => {
  return areas.filter((area) =>
    isAreaWithinBounds(area, gridColumns, gridRows)
  );
};

// Export for testing only
export const __testing__ = {
  generateGridTemplate,
  checkOverlap,
  generateUniqueAreaName,
  findNonOverlappingPosition,
  isAreaWithinBounds,
  filterAreasWithinBounds,
};

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

  // Validation is now handled by GridPositionInputs component

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
        <GridPositionInputs
          value={value}
          onChange={(position) => setValue({ ...value, ...position })}
          onBlur={handleSave}
          gridColumns={gridColumns}
          gridRows={gridRows}
          checkBounds
        />
      </Grid>
      {hasDuplicateName && (
        <Text variant="labels" color="destructive">
          Area name already exists
        </Text>
      )}
      {hasOverlap && (
        <Text variant="labels" color="destructive">
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

  const addArea = useCallback(() => {
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
      const currentRowTracks = parseGridTemplateTrackList(rowsValue);
      const lastRowSize =
        currentRowTracks[currentRowTracks.length - 1]?.value || "1fr";
      const updatedRows = [
        ...currentRowTracks.map((t) => t.value),
        lastRowSize,
      ].join(" ");
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
  }, [areas, columns, rows, rowsValue]);

  return (
    <CollapsibleSectionRoot
      label={`Areas (${areas.length})`}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      fullWidth
      trigger={
        <Flex
          align="center"
          justify="between"
          css={{ padding: theme.spacing[5] }}
        >
          <Text variant="labels" color="subtle">
            Areas ({areas.length})
          </Text>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              addArea();
            }}
          >
            <PlusIcon />
          </IconButton>
        </Flex>
      }
    >
      <CssValueListArrowFocus>
        <Flex direction="column">
          {areas.length === 0 && (
            <Text
              color="subtle"
              align="center"
              css={{ padding: theme.panel.padding }}
            >
              No Areas
            </Text>
          )}
          {areas.map((area, index) => (
            <FloatingPanel
              key={area.name}
              placement="bottom-within"
              title="Edit Area"
              content={
                <AreaEditor
                  area={area}
                  editingIndex={index}
                  gridColumns={columns}
                  gridRows={rows}
                  existingAreas={areas}
                  onSave={saveArea}
                  onClose={() => setEditingAreaIndex(undefined)}
                />
              }
              open={editingAreaIndex === index}
              onOpenChange={(open) => {
                if (open) {
                  setEditingAreaIndex(index);
                } else {
                  setEditingAreaIndex(undefined);
                }
              }}
            >
              <CssValueListItem
                id={String(index)}
                index={index}
                label={
                  <Label truncate>
                    {area.name} ({area.columnStart}-{area.columnEnd - 1} /{" "}
                    {area.rowStart}-{area.rowEnd - 1})
                  </Label>
                }
                buttons={
                  <SmallIconButton
                    variant="destructive"
                    tabIndex={-1}
                    icon={<MinusIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeArea(area.name);
                    }}
                  />
                }
              />
            </FloatingPanel>
          ))}
        </Flex>
      </CssValueListArrowFocus>
    </CollapsibleSectionRoot>
  );
};
