import type { Meta } from "@storybook/react";
import { useEffect } from "react";
import { StorySection } from "@webstudio-is/design-system";
import { subscribeCommands } from "~/builder/shared/commands";
import {
  KeyboardShortcutsDialog as KeyboardShortcutsDialogComponent,
  openKeyboardShortcutsDialog,
} from "./keyboard-shortcuts-dialog";

// Initialize commands
subscribeCommands();

export default {
  title: "Keyboard shortcuts dialog",
} satisfies Meta;

export const KeyboardShortcuts = () => {
  useEffect(openKeyboardShortcutsDialog, []);
  return (
    <StorySection title="Keyboard Shortcuts">
      <KeyboardShortcutsDialogComponent />
    </StorySection>
  );
};
