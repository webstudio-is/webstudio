import { useCallback, useEffect, useRef, useState } from "react";
import {
  type RangeSelection,
  type TextNode,
  type LexicalEditor,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  type TextFormatType,
  createCommand,
  COMMAND_PRIORITY_EDITOR,
} from "lexical";
import { $getNearestNodeOfType } from "@lexical/utils";
import { $patchStyleText } from "@lexical/selection";
import { LinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { textToolbarStore } from "~/shared/nano-states";
import { subscribeScrollState } from "~/canvas/shared/scroll-state";

let activeEditor: undefined | LexicalEditor;

export const getActiveEditor = () => {
  return activeEditor;
};

export const TOGGLE_SPAN_COMMAND = createCommand<void>();
export const CLEAR_FORMAT_COMMAND = createCommand<void>();

const spanTriggerName = "--style-node-trigger";

export const $isSpanNode = (node: TextNode) => {
  return node.getStyle().includes(spanTriggerName);
};

export const $setNodeSpan = (node: TextNode) => {
  return node.setStyle(`${spanTriggerName}: 1;`);
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
        [spanTriggerName]: "1",
      });
    } else {
      // clear span nodes style
      for (const node of spans) {
        node.setStyle("");
      }
    }
  }
};

const $clearText = () => {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    // split nodes by selection and mark with style
    $patchStyleText(selection, {
      "--clear-selection-trigger": "1",
    });
    // recompute selection to get new splitted nodes
    const newSelection = $getSelection();
    if ($isRangeSelection(newSelection)) {
      for (const node of selection.getNodes()) {
        if ($isTextNode(node)) {
          node.setFormat(0);
          node.setStyle("");
        }
      }
    }
  }
};

const $isSelectedLink = (selection: RangeSelection) => {
  const [selectedNode] = selection.getNodes();
  return $getNearestNodeOfType(selectedNode, LinkNode) != null;
};

export const hasSelectionFormat = (formatType: TextFormatType | "link") => {
  return activeEditor?.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      if (formatType === "link") {
        return $isSelectedLink(selection);
      }
      return selection.hasFormat(formatType);
    }
  });
};

const getSelectionClienRect = () => {
  const nativeSelection = window.getSelection();
  if (nativeSelection === null) {
    return;
  }
  const domRange = nativeSelection.getRangeAt(0);
  return domRange.getBoundingClientRect();
};

const ToolbarConnectorPluginInternal = ({
  onSelectNode,
}: {
  onSelectNode: (nodeKey: string) => void;
}) => {
  const [editor] = useLexicalComposerContext();

  const isMouseDownRef = useRef(false);
  // control toolbar state on data or selection updates
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (
      $isRangeSelection(selection) &&
      selection.getTextContent().length !== 0 &&
      isMouseDownRef.current === false
    ) {
      const selectionRect = getSelectionClienRect();
      const isBold = selection.hasFormat("bold");
      const isItalic = selection.hasFormat("italic");
      const isSuperscript = selection.hasFormat("superscript");
      const isSubscript = selection.hasFormat("subscript");
      const isLink = $isSelectedLink(selection);
      const isSpan = $getSpanNodes(selection).length !== 0;
      textToolbarStore.set({
        selectionRect,
        isBold,
        isItalic,
        isSuperscript,
        isSubscript,
        isLink,
        isSpan,
      });
    } else {
      textToolbarStore.set(undefined);
    }
  }, []);

  useEffect(() => {
    return subscribeScrollState({
      onScrollStart: () => {
        // hide toolbar on scroll start preserving all data
        const textToolbar = textToolbarStore.get();
        if (textToolbar) {
          textToolbarStore.set({
            ...textToolbar,
            selectionRect: undefined,
          });
        }
      },
      onScrollEnd: () => {
        // restore toolbar with new position
        const textToolbar = textToolbarStore.get();
        if (textToolbar) {
          textToolbarStore.set({
            ...textToolbar,
            selectionRect: getSelectionClienRect(),
          });
        }
      },
    });
  }, []);

  // prevent showing toolbar when select with mouse
  useEffect(() => {
    const onMouseDown = () => {
      isMouseDownRef.current = true;
    };
    const onMouseUp = () => {
      isMouseDownRef.current = false;
      const editorState = editor.getEditorState();
      editorState.read(() => {
        updateToolbar();
      });
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [editor, updateToolbar]);

  useEffect(() => {
    // hide toolbar when editor is unmounted
    return () => {
      textToolbarStore.set(undefined);
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

  useEffect(() => {
    return editor.registerCommand(
      TOGGLE_SPAN_COMMAND,
      () => {
        editor.update(
          () => {
            $toggleSpan();
          },
          {
            onUpdate: () => {
              const editorState = editor.getEditorState();
              editorState.read(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  const spans = $getSpanNodes(selection);
                  if (spans.length !== 0) {
                    const [node] = spans;
                    onSelectNode(node.getKey());
                  }
                }
              });
            },
          }
        );
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, onSelectNode]);

  useEffect(() => {
    return editor.registerCommand(
      CLEAR_FORMAT_COMMAND,
      () => {
        editor.update(() => {
          $clearText();
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
};

export const ToolbarConnectorPlugin = ({
  onSelectNode,
}: {
  onSelectNode: (nodeKey: string) => void;
}) => {
  const [editor] = useLexicalComposerContext();
  const [hasRootElement, setHasRootElement] = useState(false);

  useEffect(() => {
    const rootElement = editor.getRootElement();

    /**
     * We don't set root element for VisuallyHidden nodes
     * and need to prevent Toolbar events in this case
     */
    if (rootElement === null) {
      return;
    }

    setHasRootElement(true);

    activeEditor = editor;
  }, [editor]);

  if (hasRootElement === false) {
    return null;
  }

  return <ToolbarConnectorPluginInternal onSelectNode={onSelectNode} />;
};
