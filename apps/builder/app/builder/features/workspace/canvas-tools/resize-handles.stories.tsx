import { useEffect } from "react";
import { Box, StorySection } from "@webstudio-is/design-system";
import { $isResizingCanvas, $selectedBreakpointId } from "~/shared/nano-states";
import { $breakpoints } from "~/shared/sync/data-stores";
import { $canvasWidth, $workspaceRect } from "~/builder/shared/nano-states";
import { ResizeHandles } from "./resize-handles";

export default {
  title: "Canvas tools/Resize handles",
  component: ResizeHandles,
};

const ResizeStory = ({
  surface,
  resizing,
}: {
  surface: "bright" | "dark";
  resizing: boolean;
}) => {
  useEffect(() => {
    const previous = {
      resizing: $isResizingCanvas.get(),
      breakpointId: $selectedBreakpointId.get(),
      breakpoints: $breakpoints.get(),
      canvasWidth: $canvasWidth.get(),
      workspaceRect: $workspaceRect.get(),
    };
    $breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
    $selectedBreakpointId.set("base");
    $canvasWidth.set(600);
    $workspaceRect.set(new DOMRect(0, 0, 800, 500));
    $isResizingCanvas.set(resizing);
    return () => {
      $isResizingCanvas.set(previous.resizing);
      $selectedBreakpointId.set(previous.breakpointId);
      $breakpoints.set(previous.breakpoints);
      $canvasWidth.set(previous.canvasWidth);
      $workspaceRect.set(previous.workspaceRect);
    };
  }, [resizing]);

  return (
    <StorySection title="Canvas resize handles">
      <Box
        css={{
          position: "relative",
          width: 600,
          height: 420,
          backgroundColor: surface === "bright" ? "#fff" : "#151515",
        }}
      >
        <ResizeHandles />
      </Box>
    </StorySection>
  );
};

export const BrightIdle = () => (
  <ResizeStory surface="bright" resizing={false} />
);
export const DarkIdle = () => <ResizeStory surface="dark" resizing={false} />;
export const BrightResizing = () => <ResizeStory surface="bright" resizing />;
export const DarkResizing = () => <ResizeStory surface="dark" resizing />;
