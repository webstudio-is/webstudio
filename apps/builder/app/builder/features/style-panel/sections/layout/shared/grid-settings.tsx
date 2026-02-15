import { useState, useMemo, useCallback, useRef } from "react";
import {
  theme,
  Flex,
  Text,
  IconButton,
  FloatingPanel,
  Label,
  CssValueListItem,
  CssValueListArrowFocus,
  SmallIconButton,
  useSortable,
} from "@webstudio-is/design-system";
import { PlusIcon, MinusIcon } from "@webstudio-is/icons";
import { toValue, type StyleValue } from "@webstudio-is/css-engine";
import { CssValueInputContainer } from "../../../shared/css-value-input";
import { useComputedStyleDecl } from "../../../shared/model";
import { createBatchUpdate } from "../../../shared/use-style-data";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { GridAreas } from "./grid-areas";

const parseTrackList = (value: string): string[] => {
  if (!value || value === "none") {
    return [];
  }
  // Simple parsing - split by spaces
  // TODO: Handle complex values like minmax(), repeat()
  return value.split(/\s+/).filter(Boolean);
};

const serializeTrackList = (tracks: string[]): StyleValue => {
  if (tracks.length === 0) {
    return { type: "keyword", value: "none" };
  }
  return {
    type: "unparsed",
    value: tracks.join(" "),
  };
};

type TrackEditorProps = {
  property: "grid-template-columns" | "grid-template-rows";
  label: string;
};

const TrackEditor = ({ property, label }: TrackEditorProps) => {
  const styleDecl = useComputedStyleDecl(property);
  const value = toValue(styleDecl.cascadedValue);
  const tracks = parseTrackList(value);
  const [isOpen, setIsOpen] = useOpenState(label);
  const [editingIndex, setEditingIndex] = useState<number | undefined>(
    undefined
  );

  const updateTracks = useCallback(
    (newTracks: string[]) => {
      const batch = createBatchUpdate();
      batch.setProperty(property)(serializeTrackList(newTracks));
      batch.publish();
    },
    [property]
  );

  const addTrack = useCallback(() => {
    const newTracks = [...tracks, "1fr"];
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
      newTracks[index] = newValue;
      updateTracks(newTracks);
    },
    [tracks, updateTracks]
  );

  const swapTracks = (newIndex: number, oldIndex: number) => {
    if (oldIndex === newIndex) {
      return;
    }
    const newTracks = [...tracks];
    const [removed] = newTracks.splice(oldIndex, 1);
    newTracks.splice(newIndex, 0, removed);
    updateTracks(newTracks);
  };

  const sortableItems = useMemo(
    () => tracks.map((_, index) => ({ id: String(index) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracks.length]
  );

  // Use ref to avoid stale closure in useSortable
  const swapTracksRef = useRef(swapTracks);
  swapTracksRef.current = swapTracks;

  const { dragItemId, placementIndicator, sortableRefCallback } = useSortable({
    items: sortableItems,
    onSort: (newIndex, oldIndex) => swapTracksRef.current(newIndex, oldIndex),
  });

  return (
    <CollapsibleSectionRoot
      label={`${label} (${tracks.length})`}
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
            {label} ({tracks.length})
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
              No {label.toLowerCase()}
            </Text>
          )}
          {tracks.map((track, index) => {
            const id = String(index);
            return (
              <FloatingPanel
                key={id}
                placement="bottom-within"
                title={`Edit ${label.slice(0, -1)}`}
                content={
                  <Flex
                    direction="column"
                    gap="2"
                    css={{ padding: theme.panel.padding }}
                  >
                    <Label>Size</Label>
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
                        updateTrack(index, stringValue);
                      }}
                      onDelete={() => {
                        // Don't allow deleting from input
                      }}
                    />
                  </Flex>
                }
                open={editingIndex === index}
                onOpenChange={(open) => {
                  if (open) {
                    setEditingIndex(index);
                  } else {
                    setEditingIndex(undefined);
                  }
                }}
              >
                <CssValueListItem
                  id={id}
                  draggable
                  active={dragItemId === id}
                  index={index}
                  label={
                    <Label truncate>
                      {label.slice(0, -1)} {index + 1}: {track}
                    </Label>
                  }
                  buttons={
                    <SmallIconButton
                      variant="destructive"
                      tabIndex={-1}
                      icon={<MinusIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrack(index);
                      }}
                    />
                  }
                />
              </FloatingPanel>
            );
          })}
          {placementIndicator}
        </Flex>
      </CssValueListArrowFocus>
    </CollapsibleSectionRoot>
  );
};

type GridSettingsPanelProps = {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const GridSettingsPanel = ({
  children,
  open,
  onOpenChange,
}: GridSettingsPanelProps) => {
  return (
    <FloatingPanel
      title="Grid settings"
      content={
        <Flex direction="column" data-floating-panel-container>
          <TrackEditor property="grid-template-columns" label="Columns" />
          <TrackEditor property="grid-template-rows" label="Rows" />
          <GridAreas />
        </Flex>
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </FloatingPanel>
  );
};
