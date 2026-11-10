import { useEffect, useState } from "react";
import { Button, StorySection } from "@webstudio-is/design-system";
import type { Breakpoint } from "@webstudio-is/sdk";
import { $breakpoints } from "~/shared/sync/data-stores";
import { BreakpointsEditor } from "./breakpoints-editor";
import { ConfirmationDialog } from "./confirmation-dialog";

const desktop: Breakpoint = {
  id: "desktop",
  label: "Desktop",
  minWidth: 1280,
};

export default {
  title: "Builder/Breakpoints editor",
  component: BreakpointsEditor,
};

const BreakpointsStory = ({ empty = false }: { empty?: boolean }) => {
  const [open, setOpen] = useState(true);
  const [toDelete, setToDelete] = useState<Breakpoint>();
  useEffect(() => {
    const previous = $breakpoints.get();
    $breakpoints.set(
      new Map(
        empty
          ? []
          : [
              ["base", { id: "base", label: "" }],
              [desktop.id, desktop],
              ["mobile", { id: "mobile", label: "Mobile", maxWidth: 767 }],
            ]
      )
    );
    return () => $breakpoints.set(previous);
  }, [empty]);
  return (
    <StorySection title="Breakpoints">
      <BreakpointsEditor
        open={open && toDelete === undefined}
        onOpenChange={setOpen}
        onDelete={(breakpoint) => setToDelete(breakpoint)}
      >
        <Button>Breakpoints</Button>
      </BreakpointsEditor>
      {toDelete && (
        <ConfirmationDialog
          open
          breakpoint={toDelete}
          onAbort={() => setToDelete(undefined)}
          onConfirm={() => setToDelete(undefined)}
        />
      )}
    </StorySection>
  );
};

export const Populated = () => <BreakpointsStory />;
export const Empty = () => <BreakpointsStory empty />;
export const DeleteConfirmation = () => (
  <ConfirmationDialog
    open
    breakpoint={desktop}
    onAbort={() => {}}
    onConfirm={() => {}}
  />
);
