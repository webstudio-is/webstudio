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
};

export const KeyboardShortcuts = () => {
  useEffect(openKeyboardShortcutsDialog, []);
  return <KeyboardShortcutsDialog />;
};
