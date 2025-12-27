import { useState } from "react";
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
import { PlusIcon, TrashIcon } from "@webstudio-is/icons";
import { toValue } from "@webstudio-is/css-engine";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { useComputedStyleDecl } from "../../../shared/model";
import { createBatchUpdate } from "../../../shared/use-style-data";

// Parse grid-template-areas and extract area information with positions
type AreaInfo = {
  name: string;
  columnStart: number;
  columnEnd: number;
  rowStart: number;
  rowEnd: number;
};

const parseGridAreas = (value: string): AreaInfo[] => {
  if (!value || value === "none") {
    return [];
  }

  // grid-template-areas: "header header" "sidebar main" "footer footer"
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

// Get grid dimensions from template columns/rows
const getGridDimensions = (
  columnsValue: string,
  rowsValue: string
): { columns: number; rows: number } => {
  const columns =
    columnsValue && columnsValue !== "none"
      ? columnsValue.split(/\s+/).filter(Boolean).length
      : 2;
  const rows =
    rowsValue && rowsValue !== "none"
      ? rowsValue.split(/\s+/).filter(Boolean).length
      : 2;
  return { columns, rows };
};

type AreaEditorProps = {
  area: AreaInfo | null;
  gridColumns: number;
  gridRows: number;
  onSave: (area: AreaInfo, oldName?: string) => void;
  onClose: () => void;
};

const AreaEditor = ({
  area,
  gridColumns,
  gridRows,
  onSave,
  onClose,
}: AreaEditorProps) => {
  const [name, setName] = useState(area?.name || "Area");
  const [columnStart, setColumnStart] = useState(area?.columnStart || 1);
  const [columnEnd, setColumnEnd] = useState(
    area?.columnEnd || gridColumns + 1
  );
  const [rowStart, setRowStart] = useState(area?.rowStart || 1);
  const [rowEnd, setRowEnd] = useState(area?.rowEnd || gridRows + 1);

  const handleSave = () => {
    // Validate CSS identifier
    const sanitizedName = name.trim().replace(/[^\w-]/g, "") || "Area";
    if (!/^[a-zA-Z_]/.test(sanitizedName)) {
      return;
    }
    onSave(
      {
        name: sanitizedName,
        columnStart: Math.max(1, Math.min(columnStart, gridColumns)),
        columnEnd: Math.max(2, Math.min(columnEnd, gridColumns + 1)),
        rowStart: Math.max(1, Math.min(rowStart, gridRows)),
        rowEnd: Math.max(2, Math.min(rowEnd, gridRows + 1)),
      },
      area?.name
    );
  };

  return (
    <Flex direction="column" gap="3" css={{ padding: theme.panel.padding }}>
      <Grid gap="1">
        <Label>Name</Label>
        <InputField
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSave();
            } else if (event.key === "Escape") {
              onClose();
            }
          }}
          placeholder="Area"
          autoFocus
        />
      </Grid>

      <Grid gap="1">
        <Label>Position</Label>
        <Grid
          css={{
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: theme.spacing[3],
          }}
        >
          <InputField
            type="number"
            value={String(columnStart)}
            onChange={(event) =>
              setColumnStart(Number(event.target.value) || 1)
            }
            min={1}
            max={gridColumns}
          />
          <InputField
            type="number"
            value={String(columnEnd)}
            onChange={(event) => setColumnEnd(Number(event.target.value) || 2)}
            min={2}
            max={gridColumns + 1}
          />
          <InputField
            type="number"
            value={String(rowStart)}
            onChange={(event) => setRowStart(Number(event.target.value) || 1)}
            min={1}
            max={gridRows}
          />
          <InputField
            type="number"
            value={String(rowEnd)}
            onChange={(event) => setRowEnd(Number(event.target.value) || 2)}
            min={2}
            max={gridRows + 1}
          />
        </Grid>
        <Grid
          css={{
            gridTemplateColumns: "1fr 1fr",
            gap: theme.spacing[3],
            marginTop: theme.spacing[1],
          }}
        >
          <Text variant="labelsSentenceCase" color="subtle" align="center">
            Column: start/end
          </Text>
          <Text variant="labelsSentenceCase" color="subtle" align="center">
            Row: start/end
          </Text>
        </Grid>
      </Grid>
    </Flex>
  );
};

export const GridAreas = () => {
  const [isOpen, setIsOpen] = useOpenState("Areas");
  const [editingArea, setEditingArea] = useState<AreaInfo | null>(null);

  const gridTemplateAreas = useComputedStyleDecl("grid-template-areas");
  const gridTemplateColumns = useComputedStyleDecl("grid-template-columns");
  const gridTemplateRows = useComputedStyleDecl("grid-template-rows");

  const areasValue = toValue(gridTemplateAreas.cascadedValue);
  const columnsValue = toValue(gridTemplateColumns.cascadedValue);
  const rowsValue = toValue(gridTemplateRows.cascadedValue);

  const areas = parseGridAreas(areasValue);
  const { columns, rows } = getGridDimensions(columnsValue, rowsValue);

  const generateGridTemplate = (allAreas: AreaInfo[]): string => {
    // Create a 2D grid filled with dots
    const grid: string[][] = Array.from({ length: rows }, () =>
      Array(columns).fill(".")
    );

    // Fill in each area
    allAreas.forEach((area) => {
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

  const saveArea = (newArea: AreaInfo, oldName?: string) => {
    const batch = createBatchUpdate();

    let updatedAreas = [...areas];

    if (oldName) {
      // Update existing area
      updatedAreas = updatedAreas.map((a) =>
        a.name === oldName ? newArea : a
      );
    } else {
      // Add new area
      updatedAreas.push(newArea);
    }

    const template = generateGridTemplate(updatedAreas);
    batch.setProperty("grid-template-areas")({
      type: "unparsed",
      value: template,
    });
    batch.publish();
    setEditingArea(null);
  };

  const removeArea = (areaName: string) => {
    const batch = createBatchUpdate();
    const remainingAreas = areas.filter((a) => a.name !== areaName);

    if (remainingAreas.length === 0) {
      batch.setProperty("grid-template-areas")({
        type: "keyword",
        value: "none",
      });
    } else {
      const template = generateGridTemplate(remainingAreas);
      batch.setProperty("grid-template-areas")({
        type: "unparsed",
        value: template,
      });
    }
    batch.publish();
  };

  return (
    <CollapsibleSectionRoot
      label="Areas"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <Flex
          align="center"
          justify="between"
          css={{ padding: theme.spacing[5] }}
        >
          <Text variant="labelsSentenceCase" color="subtle">
            Areas
          </Text>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setEditingArea({
                name: "Area",
                columnStart: 1,
                columnEnd: columns + 1,
                rowStart: 1,
                rowEnd: rows + 1,
              });
            }}
          >
            <PlusIcon />
          </IconButton>
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="1"
        css={{ paddingLeft: theme.spacing[9], paddingRight: theme.spacing[9] }}
      >
        {areas.length === 0 && !editingArea && (
          <Text
            color="subtle"
            align="center"
            css={{ padding: theme.spacing[5] }}
          >
            No Areas
          </Text>
        )}
        {areas.map((area) => (
          <Grid
            key={area.name}
            gap="2"
            css={{
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              padding: theme.spacing[3],
              borderRadius: theme.borderRadius[4],
              cursor: "pointer",
              "&:hover": {
                backgroundColor: theme.colors.backgroundHover,
              },
            }}
            onClick={() => setEditingArea(area)}
          >
            <Text color="subtle">⊞</Text>
            <Text>
              {area.name} Row {area.rowStart} / Col {area.columnStart}
            </Text>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                removeArea(area.name);
              }}
            >
              <TrashIcon />
            </IconButton>
          </Grid>
        ))}
      </Flex>

      {editingArea && (
        <FloatingPanel
          title={
            areas.some((a) => a.name === editingArea.name)
              ? "Edit Area"
              : "New Area"
          }
          content={
            <AreaEditor
              area={editingArea}
              gridColumns={columns}
              gridRows={rows}
              onSave={saveArea}
              onClose={() => setEditingArea(null)}
            />
          }
          open={editingArea !== null}
          onOpenChange={(open) => {
            if (!open) setEditingArea(null);
          }}
        >
          <div />
        </FloatingPanel>
      )}
    </CollapsibleSectionRoot>
  );
};
