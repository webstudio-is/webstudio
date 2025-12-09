import type { Meta, StoryFn } from "@storybook/react";
import { useEffect } from "react";
import { initialBreakpoints, coreMetas } from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { $breakpoints, $registeredComponentMetas } from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { subscribeCommands } from "~/builder/shared/commands";
import {
  KeyboardShortcutsDialog,
  openKeyboardShortcutsDialog,
} from "./keyboard-shortcuts-dialog";

const meta: Meta = {
  title: "Keyboard Shortcuts Dialog",
};
export default meta;

registerContainers();

$registeredComponentMetas.set(
  new Map(
    Object.entries({
      ...coreMetas,
      ...baseComponentMetas,
    })
  )
);

$breakpoints.set(
  new Map(
    initialBreakpoints.map((breakpoint, index) => [
      index.toString(),
      { ...breakpoint, id: index.toString() },
    ])
  )
);

// Initialize commands
subscribeCommands();

export const KeyboardShortcuts: StoryFn = () => {
  useEffect(() => {
    openKeyboardShortcutsDialog();
  }, []);

  return (
    <>
      <button onClick={openKeyboardShortcutsDialog}>
        Open Keyboard Shortcuts
      </button>
      <KeyboardShortcutsDialog />
    </>
  );
};
