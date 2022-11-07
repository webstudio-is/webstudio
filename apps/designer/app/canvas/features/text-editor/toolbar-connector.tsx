import { useCallback, useEffect } from "react";
import {
  type RangeSelection,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
} from "lexical";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isAtNodeEnd } from "@lexical/selection";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useSubscribe, publish } from "~/shared/pubsub";

const getSelectedNode = (selection: RangeSelection) => {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
  }
};

const isSelectedLink = (selection: RangeSelection) => {
  const node = getSelectedNode(selection);
  const parent = node.getParent();
  return $isLinkNode(parent) || $isLinkNode(node);
};

export const ToolbarConnectorPlugin = () => {
  const [editor] = useLexicalComposerContext();

  // control toolbar state on data or selection updates
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    const nativeSelection = window.getSelection();
    if (
      $isRangeSelection(selection) &&
      selection.getTextContent().length !== 0 &&
      nativeSelection != null
    ) {
      const domRange = nativeSelection.getRangeAt(0);
      const selectionRect = domRange.getBoundingClientRect();
      const isBold = selection.hasFormat("bold");
      const isItalic = selection.hasFormat("italic");
      const isLink = isSelectedLink(selection);
      publish({
        type: "showTextToolbar",
        payload: { selectionRect, isBold, isItalic, isLink },
      });
    } else {
      publish({ type: "hideTextToolbar" });
    }
  }, []);

  useEffect(() => {
    // hide toolbar when editor is unmounted
    return () => {
      publish({ type: "hideTextToolbar" });
    };
  }, []);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  // dispatch commands sent from toolbar
  useSubscribe("formatTextToolbar", (type) => {
    if (type === "bold") {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
    }
    if (type === "italic") {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
    }
    if (type === "link") {
      const editorState = editor.getEditorState();
      let isLink = false;
      editorState.read(() => {
        const selection = $getSelection();
        isLink = $isRangeSelection(selection) && isSelectedLink(selection);
      });
      if (isLink) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      } else {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
      }
    }
  });

  return null;
};
