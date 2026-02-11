import { useState } from "react";
import { useStore } from "@nanostores/react";
import { Flex } from "@webstudio-is/design-system";
import { $breakpoints, $styles } from "~/shared/sync/data-stores";
import {
  $selectedBreakpoint,
  $selectedBreakpointId,
} from "~/shared/nano-states";
import { CanvasSettingsPopover } from "./canvas-settings-popover";
import { BreakpointsSelector } from "./breakpoints-selector";
import { BreakpointsMenu } from "./breakpoints-menu";
import { BreakpointsEditor } from "./breakpoints-editor";
import { ConfirmationDialog } from "./confirmation-dialog";
import { isBaseBreakpoint } from "~/shared/breakpoints";
import { setCanvasWidth } from "../../shared/calc-canvas-width";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import type { Breakpoint } from "@webstudio-is/sdk";

const hideOnMobile = {
  "@media (max-width: 800px)": {
    display: "none",
  },
} as const;

export const BreakpointsContainer = () => {
  const breakpoints = useStore($breakpoints);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const [editorOpen, setEditorOpen] = useState(false);
  const [breakpointToDelete, setBreakpointToDelete] = useState<
    Breakpoint | undefined
  >();
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const handleDelete = () => {
    if (breakpointToDelete === undefined) {
      return;
    }
    serverSyncStore.createTransaction(
      [$breakpoints, $styles],
      (breakpoints, styles) => {
        const breakpointId = breakpointToDelete.id;
        breakpoints.delete(breakpointId);
        for (const [styleDeclKey, styleDecl] of styles) {
          if (styleDecl.breakpointId === breakpointId) {
            styles.delete(styleDeclKey);
          }
        }
      }
    );

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
    setConfirmationOpen(false);
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
          onEditClick={() => setEditorOpen(true)}
        />
      )}
      <BreakpointsEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onDelete={(breakpoint) => {
          setBreakpointToDelete(breakpoint);
          setEditorOpen(false);
          setConfirmationOpen(true);
        }}
      >
        <div style={{ height: "100%", width: 0 }} />
      </BreakpointsEditor>
      {breakpointToDelete && (
        <ConfirmationDialog
          open={confirmationOpen}
          breakpoint={breakpointToDelete}
          onAbort={() => {
            setBreakpointToDelete(undefined);
            setConfirmationOpen(false);
            setEditorOpen(true);
          }}
          onConfirm={handleDelete}
        />
      )}
    </Flex>
  );
};
