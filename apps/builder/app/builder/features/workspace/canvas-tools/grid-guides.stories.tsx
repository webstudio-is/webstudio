import { useEffect } from "react";
import { Box, StorySection } from "@webstudio-is/design-system";
import { $gridCellData } from "~/shared/nano-states";
import {
  $canvasWidth,
  $gridEditingArea,
  $gridEditingTrack,
  $workspaceRect,
} from "~/builder/shared/nano-states";
import { $ephemeralStyles } from "~/canvas/stores";
import { GridGuides } from "./grid-guides";

export default { title: "Canvas tools/Grid guides", component: GridGuides };

const GridStory = ({
  surface,
  state,
}: {
  surface: "bright" | "dark";
  state: "plain" | "areas" | "track" | "area";
}) => {
  useEffect(() => {
    const previous = {
      gridCellData: $gridCellData.get(),
      canvasWidth: $canvasWidth.get(),
      workspaceRect: $workspaceRect.get(),
      editingArea: $gridEditingArea.get(),
      editingTrack: $gridEditingTrack.get(),
      ephemeralStyles: $ephemeralStyles.get(),
    };
    $canvasWidth.set(800);
    $workspaceRect.set(new DOMRect(0, 0, 800, 500));
    $ephemeralStyles.set([]);
    $gridCellData.set({
      instanceId: "grid",
      bcr: { left: 100, top: 80 },
      untransformedWidth: 540,
      untransformedHeight: 300,
      columnCount: 3,
      rowCount: 2,
      implicitColumnStart: 3,
      implicitRowStart: 2,
      resolvedCssText: [
        "display: grid",
        "width: 540px",
        "height: 300px",
        "grid-template-columns: repeat(3, 1fr)",
        "grid-template-rows: repeat(2, 1fr)",
        `grid-template-areas: ${state === "plain" ? "none" : '"hero hero menu" "main main menu"'}`,
      ].join("; "),
    });
    $gridEditingTrack.set(
      state === "track" ? { type: "column", index: 1 } : undefined
    );
    $gridEditingArea.set(
      state === "area"
        ? { columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 }
        : undefined
    );
    return () => {
      $gridCellData.set(previous.gridCellData);
      $canvasWidth.set(previous.canvasWidth);
      $workspaceRect.set(previous.workspaceRect);
      $gridEditingArea.set(previous.editingArea);
      $gridEditingTrack.set(previous.editingTrack);
      $ephemeralStyles.set(previous.ephemeralStyles);
    };
  }, [state]);

  return (
    <StorySection title="Grid guides">
      <Box
        css={{
          position: "relative",
          width: 800,
          height: 500,
          backgroundColor: surface === "bright" ? "#fff" : "#151515",
        }}
      >
        <GridGuides />
      </Box>
    </StorySection>
  );
};

export const BrightCells = () => <GridStory surface="bright" state="plain" />;
export const DarkCells = () => <GridStory surface="dark" state="plain" />;
export const BrightAreas = () => <GridStory surface="bright" state="areas" />;
export const DarkAreas = () => <GridStory surface="dark" state="areas" />;
export const TrackHighlight = () => <GridStory surface="dark" state="track" />;
export const AreaHighlight = () => <GridStory surface="bright" state="area" />;
