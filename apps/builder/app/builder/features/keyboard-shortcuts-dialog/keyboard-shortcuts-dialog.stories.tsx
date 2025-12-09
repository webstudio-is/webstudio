import type { Meta } from "@storybook/react";
import { useEffect } from "react";
import { subscribeCommands } from "~/builder/shared/commands";
import {
  KeyboardShortcutsDialog,
  openKeyboardShortcutsDialog,
} from "./keyboard-shortcuts-dialog";

// Initialize commands
subscribeCommands();

export default {
  title: "Keyboard Shortcuts Dialog",
} satisfies Meta;

export const KeyboardShortcuts = () => {
  useEffect(openKeyboardShortcutsDialog, []);
  return <KeyboardShortcutsDialog />;
};
