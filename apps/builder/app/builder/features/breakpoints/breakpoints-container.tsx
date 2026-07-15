import { useState } from "react";
import { useStore } from "@nanostores/react";
import { Flex } from "@webstudio-is/design-system";
import { $breakpoints } from "~/shared/sync/data-stores";
import {
  $selectedBreakpoint,
  $selectedBreakpointId,
} from "~/shared/nano-states";
import { CanvasSettingsPopover } from "./canvas-settings-popover";
import { BreakpointsSelector } from "./breakpoints-selector";
import { BreakpointsMenu } from "./breakpoints-menu";
import { BreakpointsEditor } from "./breakpoints-editor";
import { ConfirmationDialog } from "./confirmation-dialog";
import { $breakpointsMenuView } from "~/shared/breakpoints";
import { isBaseBreakpoint } from "@webstudio-is/project-build/runtime";
import { setCanvasWidth } from "../../shared/calc-canvas-width";
import type { Breakpoint } from "@webstudio-is/sdk";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";

const hideOnMobile = {
  "@media (max-width: 800px)": {
    display: "none",
  },
} as const;

export const BreakpointsContainer = () => {
  const breakpoints = useStore($breakpoints);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const breakpointsMenuView = useStore($breakpointsMenuView);
  const [breakpointToDelete, setBreakpointToDelete] = useState<
    Breakpoint | undefined
  >();

  const handleDelete = () => {
    if (breakpointToDelete === undefined) {
      return;
    }
    executeRuntimeMutation({
      id: "breakpoints.delete",
      input: {
        breakpointId: breakpointToDelete.id,
      },
    });

    if (
      breakpointToDelete.id === selectedBreakpoint?.id &&
      selectedBreakpoint
    ) {
      const breakpointsArray = Array.from(breakpoints.values());
      const base =
        breakpointsArray.find(isBaseBreakpoint) ?? breakpointsArray[0];
      $selectedBreakpointId.set(base.id);
      setCanvasWidth(base.id);
    }
    setBreakpointToDelete(undefined);
    $breakpointsMenuView.set(undefined);
  };

  return (
    <Flex>
      <Flex justify="end" css={hideOnMobile}>
        <CanvasSettingsPopover />
      </Flex>
      <Flex align="center" justify="center" css={hideOnMobile}>
        <BreakpointsSelector />
      </Flex>
      {selectedBreakpoint && (
        <BreakpointsMenu
          breakpoints={breakpoints}
          selectedBreakpoint={selectedBreakpoint}
          open={breakpointsMenuView === "initial"}
          triggerOpen={breakpointsMenuView !== undefined}
          onOpenChange={(open) => {
            if (open) {
              $breakpointsMenuView.set("initial");
              return;
            }
            if ($breakpointsMenuView.get() === "initial") {
              $breakpointsMenuView.set(undefined);
            }
          }}
          onEditClick={() => $breakpointsMenuView.set("editor")}
        />
      )}
      <BreakpointsEditor
        open={breakpointsMenuView === "editor"}
        onOpenChange={(open) => {
          $breakpointsMenuView.set(open ? "editor" : undefined);
        }}
        onDelete={(breakpoint) => {
          setBreakpointToDelete(breakpoint);
          $breakpointsMenuView.set("confirmation");
        }}
      >
        <div style={{ height: "100%", width: 0 }} />
      </BreakpointsEditor>
      {breakpointToDelete && (
        <ConfirmationDialog
          open={breakpointsMenuView === "confirmation"}
          breakpoint={breakpointToDelete}
          onAbort={() => {
            setBreakpointToDelete(undefined);
            $breakpointsMenuView.set("editor");
          }}
          onConfirm={handleDelete}
        />
      )}
    </Flex>
  );
};
