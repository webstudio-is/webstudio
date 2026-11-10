import { useEffect } from "react";
import {
  StorySection,
  TooltipProvider,
  cssVar,
} from "@webstudio-is/design-system";
import { $breakpoints } from "~/shared/sync/data-stores";
import { $selectedBreakpointId } from "~/shared/nano-states";
import { MediaBadge } from "./media-badge";
import { Toolbar } from "./text-toolbar";

export default {
  title: "Canvas tools/Floating surfaces",
};

export const TextToolbar = () => (
  <StorySection title="Text toolbar">
    <div
      style={{
        position: "relative",
        width: 500,
        height: 180,
        background: cssVar("--background-primary"),
      }}
    >
      <TooltipProvider>
        <Toolbar
          scale={100}
          state={{
            selectionRect: new DOMRect(150, 100, 80, 20),
            isBold: false,
            isItalic: false,
            isSuperscript: false,
            isSubscript: false,
            isLink: false,
            isSpan: false,
          }}
        />
      </TooltipProvider>
    </div>
  </StorySection>
);

export const WorkspaceMediaBadge = () => {
  useEffect(() => {
    const previousBreakpoints = $breakpoints.get();
    const previousSelectedId = $selectedBreakpointId.get();
    $breakpoints.set(
      new Map([["tablet", { id: "tablet", label: "Tablet", maxWidth: 991 }]])
    );
    $selectedBreakpointId.set("tablet");
    return () => {
      $breakpoints.set(previousBreakpoints);
      $selectedBreakpointId.set(previousSelectedId);
    };
  }, []);

  return (
    <StorySection title="Workspace media badge">
      <div
        style={{
          width: 500,
          height: 260,
          background: `light-dark(
            color-mix(in oklab, ${cssVar("--background-secondary")} 94%, ${cssVar("--foreground-primary")}),
            color-mix(in oklab, ${cssVar("--background-primary")} 96%, ${cssVar("--foreground-primary")})
          )`,
        }}
      >
        <div style={{ position: "relative", marginLeft: 120, height: 180 }}>
          <MediaBadge />
        </div>
      </div>
    </StorySection>
  );
};
