import { useCallback, useEffect, useRef } from "react";

import {
  $isRangeSelection,
  $getSelection,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  useLexicalComposerContext,
} from "../lexical";
import { publish } from "~/shared/pubsub";

export const ToolbarConnectorPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const lastSelectionRef = useRef<unknown>();

  const clearSelectionRect = () => {
    if (lastSelectionRef.current) {
      // Undefined Rect will hide toolbar
      publish({ type: "hideTextToolbar" });
      lastSelectionRef.current = undefined;
    }
  };

  const publishSelectionRect = useCallback(() => {
    const selection = $getSelection();
    const text = selection?.getTextContent();
    const nativeSelection = window.getSelection();
    const isTextSelected =
      $isRangeSelection(selection) && Boolean(text) && nativeSelection !== null;

    if (isTextSelected) {
      const domRange = nativeSelection.getRangeAt(0);
      const selectionRect = domRange.getBoundingClientRect();
      publish({
        type: "showTextToolbar",
        payload: {
          selectionRect,
          isBold: false,
          isItalic: false,
          isLink: false,
        },
      });
      lastSelectionRef.current = selection;
      return true;
    }

    clearSelectionRect();

    return true;
  }, []);

  useEffect(() => {
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      publishSelectionRect,
      COMMAND_PRIORITY_LOW
    );
  }, [editor, publishSelectionRect]);

  useEffect(() => clearSelectionRect, []);

  return null;
};
