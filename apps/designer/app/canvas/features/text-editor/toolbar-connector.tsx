import { useCallback, useEffect } from "react";
import {
  type RangeSelection,
  type TextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
} from "lexical";
import { $getNearestNodeOfType } from "@lexical/utils";
import { $patchStyleText } from "@lexical/selection";
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useSubscribe, publish } from "~/shared/pubsub";

const spanTriggerName = "--style-node-trigger";

export const $isSpanNode = (node: TextNode) => {
  return node.getStyle().includes(spanTriggerName);
};

export const $setNodeSpan = (node: TextNode) => {
  return node.setStyle(`${spanTriggerName}:;`);
};

const $getSpanNodes = (selection: RangeSelection) => {
  const nodes = selection.getNodes();
  const spans: TextNode[] = [];
  // check each TextNode within selection for existing span nodes
  for (const node of nodes) {
    if ($isTextNode(node) && $isSpanNode(node)) {
      spans.push(node);
    }
  }
  return spans;
};

const $toggleSpan = () => {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    const spans = $getSpanNodes(selection);
    if (spans.length === 0) {
      // lexical creates separate text node when style property do not match
      $patchStyleText(selection, {
        [spanTriggerName]: "",
      });
    } else {
      // clear span nodes style
      for (const node of spans) {
        node.setStyle("");
      }
    }
  }
};

const $isSelectedLink = (selection: RangeSelection) => {
  const [selectedNode] = selection.getNodes();
  return $getNearestNodeOfType(selectedNode, LinkNode) != null;
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
      const isLink = $isSelectedLink(selection);
      const isSpan = $getSpanNodes(selection).length !== 0;
      publish({
        type: "showTextToolbar",
        payload: { selectionRect, isBold, isItalic, isLink, isSpan },
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
        isLink = $isRangeSelection(selection) && $isSelectedLink(selection);
      });
      if (isLink) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      } else {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
      }
    }
    if (type === "span") {
      editor.update(() => {
        $toggleSpan();
      });
    }
  });

  return null;
};
