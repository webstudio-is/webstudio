import { useCallback, useEffect, useRef } from "react";
import { publish } from "@webstudio-is/sdk";

import {
  $isRangeSelection,
  $getSelection,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  useLexicalComposerContext,
} from "../lexical";

export const ToolbarConnectorPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const lastSelectionRef = useRef<unknown>();

  const publishSelectionRect = useCallback(() => {
    const selection = $getSelection();
    const text = selection?.getTextContent();
    const nativeSelection = window.getSelection();
    const isTextSelected =
      $isRangeSelection(selection) && Boolean(text) && nativeSelection !== null;

    if (isTextSelected) {
      const domRange = nativeSelection.getRangeAt(0);
      const rect = domRange.getBoundingClientRect();
      publish({ type: "selectionRect", payload: rect });
      lastSelectionRef.current = selection;
      return;
    }

    if (lastSelectionRef.current) {
      // Undefined Rect will hide toolbar
      publish({ type: "selectionRect", payload: undefined });
      lastSelectionRef.current = undefined;
    }

    return true;
  }, []);

  useEffect(() => {
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        publishSelectionRect();
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, publishSelectionRect]);

  return null;
};
