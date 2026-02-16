import { useMemo, useState, useCallback, useEffect } from "react";
import {
  theme,
  Flex,
  Text,
  FloatingPanel,
  IconButton,
  Label,
  CssValueListItem,
  CssValueListArrowFocus,
  SmallIconButton,
  useSortable,
  Button,
  Checkbox,
  Grid,
  Tooltip,
} from "@webstudio-is/design-system";
import { toValue, type StyleValue } from "@webstudio-is/css-engine";
import {
  parseGridTemplateTrackList,
  serializeGridTemplateTrackList,
  parseMinmax,
  serializeMinmax,
  checkGridTemplateSupport,
  isEditableGridMode,
  getGridAxisMode,
  type GridTrack,
} from "@webstudio-is/css-data";
import { PlusIcon, MinusIcon } from "@webstudio-is/icons";
import { useComputedStyleDecl } from "../../../shared/model";
import { CssValueInputContainer } from "../../../shared/css-value-input";
import { createBatchUpdate } from "../../../shared/use-style-data";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { GridAreas } from "./grid-areas";

const trackTypeLabels = {
  column: { singular: "Column", plural: "Columns" },
  row: { singular: "Row", plural: "Rows" },
} as const;

const serializeTrackList = (tracks: GridTrack[]): StyleValue => {
  const value = serializeGridTemplateTrackList(tracks);
  if (value === "none") {
    return { type: "keyword", value: "none" };
  }
  return { type: "unparsed", value };
};

type TrackItemProps = {
  property: "grid-template-columns" | "grid-template-rows";
  trackType: "column" | "row";
  singular: string;
  track: string;
  index: number;
  id: string;
  dragItemId: string | undefined;
  isEditing: boolean;
  onEditingChange: (open: boolean) => void;
  onUpdate: (index: number, newValue: string) => void;
  onRemove: (index: number) => void;
};

const TrackItem = ({
  property,
  trackType,
  singular,
  track,
  index,
  id,
  dragItemId,
  isEditing,
  onEditingChange,
  onUpdate,
  onRemove,
}: TrackItemProps) => {
  const minmaxParts = parseMinmax(track);
  const [isMinmax, setIsMinmax] = useState(minmaxParts !== undefined);
  const [minValue, setMinValue] = useState(minmaxParts?.min ?? "0");
  const [maxValue, setMaxValue] = useState(minmaxParts?.max ?? "1fr");

  // Sync state when track prop changes (e.g., external edits, undo/redo)
  useEffect(() => {
    const parsed = parseMinmax(track);
    setIsMinmax(parsed !== undefined);
    if (parsed) {
      setMinValue(parsed.min);
      setMaxValue(parsed.max);
    }
  }, [track]);

  const handleMinmaxToggle = (checked: boolean) => {
    setIsMinmax(checked);
    if (checked) {
      // Convert single value to minmax with reasonable defaults
      const newMin = "0";
      const newMax = track === "auto" ? "1fr" : track;
      setMinValue(newMin);
      setMaxValue(newMax);
      onUpdate(index, serializeMinmax({ min: newMin, max: newMax }));
    } else {
      // Convert minmax to single value (use max value)
      onUpdate(index, maxValue);
    }
  };

  const handleMinUpdate = (value: string) => {
    setMinValue(value);
    onUpdate(index, serializeMinmax({ min: value, max: maxValue }));
  };

  const handleMaxUpdate = (value: string) => {
    setMaxValue(value);
    onUpdate(index, serializeMinmax({ min: minValue, max: value }));
  };

  return (
    <FloatingPanel
      placement="bottom-within"
      title={`Edit ${trackType}`}
      content={
        <Flex direction="column" gap="2" css={{ padding: theme.panel.padding }}>
          {isMinmax ? (
            <Grid columns={2} gap="2">
              <Flex direction="column" gap="1">
                <Label>Min</Label>
                <CssValueInputContainer
                  styleSource="local"
                  property={property}
                  value={{
                    type: "unparsed",
                    value: minValue,
                  }}
                  onUpdate={(styleValue) => {
                    const stringValue =
                      styleValue.type === "unparsed"
                        ? styleValue.value
                        : toValue(styleValue);
                    handleMinUpdate(stringValue);
                  }}
                  onDelete={() => {}}
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Label>Max</Label>
                <CssValueInputContainer
                  styleSource="local"
                  property={property}
                  value={{
                    type: "unparsed",
                    value: maxValue,
                  }}
                  onUpdate={(styleValue) => {
                    const stringValue =
                      styleValue.type === "unparsed"
                        ? styleValue.value
                        : toValue(styleValue);
                    handleMaxUpdate(stringValue);
                  }}
                  onDelete={() => {}}
                />
              </Flex>
            </Grid>
          ) : (
            <Flex direction="column" gap="1">
              <Label>Value</Label>
              <CssValueInputContainer
                styleSource="local"
                property={property}
                value={{
                  type: "unparsed",
                  value: track,
                }}
                onUpdate={(styleValue) => {
                  const stringValue =
                    styleValue.type === "unparsed"
                      ? styleValue.value
                      : toValue(styleValue);
                  onUpdate(index, stringValue);
                }}
                onDelete={() => {}}
              />
            </Flex>
          )}
          <Flex align="center" gap="2">
            <Checkbox
              id={`minmax-${id}`}
              checked={isMinmax}
              onCheckedChange={handleMinmaxToggle}
            />
            <Label htmlFor={`minmax-${id}`}>Use min/max</Label>
          </Flex>
        </Flex>
      }
      open={isEditing}
      onOpenChange={onEditingChange}
    >
      <CssValueListItem
        id={id}
        draggable
        active={dragItemId === id}
        index={index}
        label={
          <Label truncate title={`${singular} ${index + 1}: ${track}`}>
            {singular} {index + 1}: {track}
          </Label>
        }
        buttons={
          <SmallIconButton
            variant="destructive"
            tabIndex={-1}
            icon={<MinusIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
          />
        }
      />
    </FloatingPanel>
  );
};

type TrackEditorProps = {
  property: "grid-template-columns" | "grid-template-rows";
  trackType: keyof typeof trackTypeLabels;
};

const TrackEditor = ({ property, trackType }: TrackEditorProps) => {
  const { singular, plural } = trackTypeLabels[trackType];
  const styleDecl = useComputedStyleDecl(property);
  const value = toValue(styleDecl.cascadedValue);
  const tracks = parseGridTemplateTrackList(value);
  const [isOpen, setIsOpen] = useOpenState(trackType);
  const [editingIndex, setEditingIndex] = useState<number | undefined>(
    undefined
  );

  const updateTracks = useCallback(
    (newTracks: GridTrack[]) => {
      const batch = createBatchUpdate();
      batch.setProperty(property)(serializeTrackList(newTracks));
      batch.publish();
    },
    [property]
  );

  const addTrack = useCallback(() => {
    const newTracks = [...tracks, { value: "1fr" }];
    updateTracks(newTracks);
    // Open editor for the new track
    setEditingIndex(tracks.length);
  }, [tracks, updateTracks]);

  const removeTrack = useCallback(
    (index: number) => {
      if (tracks.length > 0) {
        updateTracks(tracks.filter((_, i) => i !== index));
        if (editingIndex === index) {
          setEditingIndex(undefined);
        }
      }
    },
    [tracks, updateTracks, editingIndex]
  );

  const updateTrack = useCallback(
    (index: number, newValue: string) => {
      const newTracks = [...tracks];
      newTracks[index] = { value: newValue };
      updateTracks(newTracks);
    },
    [tracks, updateTracks]
  );

  const sortableItems = useMemo(
    () => tracks.map((_, index) => ({ id: String(index) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracks.length]
  );

  const { dragItemId, placementIndicator, sortableRefCallback } = useSortable({
    items: sortableItems,
    onSort: (newIndex, oldIndex) => {
      if (oldIndex === newIndex) {
        return;
      }
      const newTracks = [...tracks];
      const [removed] = newTracks.splice(oldIndex, 1);
      newTracks.splice(newIndex, 0, removed);
      updateTracks(newTracks);
    },
  });

  return (
    <CollapsibleSectionRoot
      label={`${plural} (${tracks.length})`}
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
            {plural} ({tracks.length})
          </Text>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              addTrack();
            }}
          >
            <PlusIcon />
          </IconButton>
        </Flex>
      }
    >
      <CssValueListArrowFocus dragItemId={dragItemId}>
        <Flex direction="column" ref={sortableRefCallback}>
          {tracks.length === 0 && (
            <Text
              color="subtle"
              align="center"
              css={{ padding: theme.panel.padding }}
            >
              No {trackType}
            </Text>
          )}
          {tracks.map((track, index) => {
            const id = String(index);
            return (
              <TrackItem
                key={id}
                property={property}
                trackType={trackType}
                singular={singular}
                track={track.value}
                index={index}
                id={id}
                dragItemId={dragItemId}
                isEditing={editingIndex === index}
                onEditingChange={(open) => {
                  if (open) {
                    setEditingIndex(index);
                  } else {
                    setEditingIndex(undefined);
                  }
                }}
                onUpdate={updateTrack}
                onRemove={removeTrack}
              />
            );
          })}
          {placementIndicator}
        </Flex>
      </CssValueListArrowFocus>
    </CollapsibleSectionRoot>
  );
};

type GridSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const GridSettings = ({ open, onOpenChange }: GridSettingsProps) => {
  const gridTemplateColumns = useComputedStyleDecl("grid-template-columns");
  const gridTemplateRows = useComputedStyleDecl("grid-template-rows");

  const columnsValue = toValue(gridTemplateColumns.cascadedValue);
  const rowsValue = toValue(gridTemplateRows.cascadedValue);

  // Check if the grid values can be edited visually
  const columnsMode = getGridAxisMode(columnsValue);
  const rowsMode = getGridAxisMode(rowsValue);
  const isEditable =
    isEditableGridMode(columnsMode) && isEditableGridMode(rowsMode);

  // Get reason for non-editable modes
  const unsupportedReason = (() => {
    if (!isEditableGridMode(columnsMode)) {
      const support = checkGridTemplateSupport(columnsValue);
      return support.supported ? undefined : support.reason;
    }
    if (!isEditableGridMode(rowsMode)) {
      const support = checkGridTemplateSupport(rowsValue);
      return support.supported ? undefined : support.reason;
    }
    return undefined;
  })();

  // Show disabled button with tooltip when unsupported
  if (!isEditable) {
    return (
      <Tooltip content={unsupportedReason}>
        <Button color="neutral" disabled css={{ width: "100%" }}>
          Edit grid
        </Button>
      </Tooltip>
    );
  }

  return (
    <FloatingPanel
      title="Grid settings"
      placement="bottom-within"
      content={
        <Flex
          direction="column"
          css={{ width: theme.spacing[30] }}
          data-floating-panel-container
        >
          <TrackEditor property="grid-template-columns" trackType="column" />
          <TrackEditor property="grid-template-rows" trackType="row" />
          <GridAreas />
        </Flex>
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <Button color="neutral" css={{ width: "100%" }}>
        Edit grid
      </Button>
    </FloatingPanel>
  );
};
