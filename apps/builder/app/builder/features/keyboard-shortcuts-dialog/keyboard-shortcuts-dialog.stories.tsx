import type { Meta } from "@storybook/react";
import { useEffect } from "react";
import { subscribeCommands } from "~/builder/shared/commands";
import {
  KeyboardShortcutsDialog as KeyboardShortcutsDialogComponent,
  openKeyboardShortcutsDialog,
} from "./keyboard-shortcuts-dialog";

// Initialize commands
subscribeCommands();

export default {
  title: "Keyboard Shortcuts Dialog",
} satisfies Meta;

export const KeyboardShortcutsDialog = () => {
  useEffect(openKeyboardShortcutsDialog, []);
  return <KeyboardShortcutsDialogComponent />;
};
