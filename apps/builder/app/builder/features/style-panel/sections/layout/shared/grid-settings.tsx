import { useState } from "react";
import {
  theme,
  Flex,
  Text,
  Button,
  IconButton,
  FloatingPanel,
  Grid,
} from "@webstudio-is/design-system";
import { PlusIcon, MinusIcon } from "@webstudio-is/icons";
import { toValue, type StyleValue } from "@webstudio-is/css-engine";
import {
  type IntermediateStyleValue,
  CssValueInput,
} from "../../../shared/css-value-input";
import { useComputedStyleDecl } from "../../../shared/model";
import { createBatchUpdate } from "../../../shared/use-style-data";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";

const parseTrackList = (value: string): string[] => {
  if (!value || value === "none") {
    return ["1fr", "1fr"]; // Default 2 tracks
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
  const [isOpen, setIsOpen] = useOpenState({ label });

  const [intermediateValues, setIntermediateValues] = useState<
    Record<number, StyleValue | IntermediateStyleValue>
  >({});

  const updateTracks = (newTracks: string[]) => {
    const batch = createBatchUpdate();
    batch.setProperty(property)(serializeTrackList(newTracks));
    batch.publish();
  };

  const addTrack = () => {
    updateTracks([...tracks, "1fr"]);
  };

  const removeTrack = (index: number) => {
    if (tracks.length > 1) {
      updateTracks(tracks.filter((_, i) => i !== index));
    }
  };

  const updateTrack = (index: number, newValue: string) => {
    const newTracks = [...tracks];
    newTracks[index] = newValue;
    updateTracks(newTracks);
  };

  return (
    <CollapsibleSectionRoot
      label={`${label} (${tracks.length})`}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <Flex
          align="center"
          justify="between"
          css={{ padding: theme.spacing[5] }}
        >
          <Text variant="labelsSentenceCase" color="subtle">
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
      <Flex direction="column" gap="2">
        {tracks.map((track, index) => (
          <Grid
            key={index}
            gap="2"
            css={{
              gridTemplateColumns: `auto 1fr auto`,
              alignItems: "center",
            }}
          >
            <Text color="subtle" css={{ textAlign: "center" }}>
              {index + 1}
            </Text>
            <CssValueInput
              styleSource="local"
              property={property}
              value={
                intermediateValues[index] ?? {
                  type: "unparsed",
                  value: track,
                }
              }
              intermediateValue={intermediateValues[index]}
              keywords={[]}
              onChange={(value) => {
                if (value && "value" in value) {
                  const stringValue =
                    value.type === "unparsed" ? value.value : toValue(value);
                  updateTrack(index, stringValue);
                }
                setIntermediateValues((prev) => {
                  const next = { ...prev };
                  delete next[index];
                  return next;
                });
              }}
              onIntermediateChange={(value) => {
                if (value !== undefined) {
                  setIntermediateValues((prev) => ({
                    ...prev,
                    [index]: value,
                  }));
                }
              }}
              onHighlight={() => {}}
              onChangeComplete={({ value }) => {
                if (value && "value" in value) {
                  const stringValue =
                    value.type === "unparsed" ? value.value : toValue(value);
                  updateTrack(index, stringValue);
                }
              }}
              onAbort={() => {
                setIntermediateValues((prev) => {
                  const next = { ...prev };
                  delete next[index];
                  return next;
                });
              }}
              onReset={() => {
                setIntermediateValues((prev) => {
                  const next = { ...prev };
                  delete next[index];
                  return next;
                });
              }}
            />
            <IconButton
              onClick={() => removeTrack(index)}
              disabled={tracks.length === 1}
              css={{ minWidth: "auto" }}
            >
              <MinusIcon />
            </IconButton>
          </Grid>
        ))}
      </Flex>
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
      title="Grid Settings"
      content={
        <Flex direction="column">
          <TrackEditor property="grid-template-columns" label="Columns" />
          <TrackEditor property="grid-template-rows" label="Rows" />
        </Flex>
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </FloatingPanel>
  );
};
