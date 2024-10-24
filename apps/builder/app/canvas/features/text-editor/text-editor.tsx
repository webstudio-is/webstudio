import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import {
  KEY_ENTER_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  RootNode,
  ElementNode,
  $createLineBreakNode,
  $getSelection,
  $isRangeSelection,
  type EditorState,
  KEY_ARROW_DOWN_COMMAND,
  $isLineBreakNode,
  KEY_ARROW_UP_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  $setSelection,
  $getRoot,
  $isTextNode,
  $isElementNode,
  type RangeSelection,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  $createRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  $getNearestNodeFromDOMNode,
  // eslint-disable-next-line camelcase
  $normalizeSelection__EXPERIMENTAL,
} from "lexical";
import { LinkNode } from "@lexical/link";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { nanoid } from "nanoid";
import { createRegularStyleSheet } from "@webstudio-is/css-engine";
import type { Instance, Instances } from "@webstudio-is/sdk";
import { idAttribute } from "@webstudio-is/react-sdk";
import type { InstanceSelector } from "~/shared/tree-utils";
import { ToolbarConnectorPlugin } from "./toolbar-connector";
import { type Refs, $convertToLexical, $convertToUpdates } from "./interop";
import { colord } from "colord";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import { findAllEditableInstanceSelector } from "~/shared/instance-utils";
import {
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedPage,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";

const BindInstanceToNodePlugin = ({ refs }: { refs: Refs }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    for (const [nodeKey, instanceId] of refs) {
      // extract key from stored key:style format
      const [key] = nodeKey.split(":");
      const element = editor.getElementByKey(key);
      if (element) {
        element.setAttribute(idAttribute, instanceId);
      }
    }
  }, [editor, refs]);
  return null;
};

const AutofocusPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const rootElement = editor.getRootElement();

    if (rootElement === null) {
      return;
    }

    editor.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

/**
 * In case of text color is near transparent, make caret visible with color animation between #666 and #999
 */
const CaretColorPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const caretClassName = useState(() => `a${nanoid()}`)[0];

  useEffect(() => {
    const rootElement = editor.getRootElement();

    if (rootElement === null) {
      return;
    }

    const elementColor = window.getComputedStyle(rootElement).color;

    const color = colord(elementColor).toRgb();
    if (color.a < 0.1) {
      // Apply caret color with animated color
      const sheet = createRegularStyleSheet({ name: "text-editor-caret" });

      // Animation on cursor needed to make it visible on any background
      sheet.addPlaintextRule(`

        @keyframes ${caretClassName}-keyframes {
          from {caret-color: #666;}
          to {caret-color: #999;}
        }

        .${caretClassName} {
          animation-name: ${caretClassName}-keyframes;
          animation-duration: 0.5s;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
      `);

      rootElement.classList.add(caretClassName);
      sheet.render();

      return () => {
        rootElement.classList.remove(caretClassName);
        sheet.unmount();
      };
    }
  }, [caretClassName, editor]);

  return null;
};

const OnChangeOnBlurPlugin = ({
  onChange,
}: {
  onChange: (editorState: EditorState) => void;
}) => {
  const [editor] = useLexicalComposerContext();
  const handleChange = useEffectEvent(onChange);

  useEffect(() => {
    const handleBlur = () => {
      handleChange(editor.getEditorState());
    };

    // https://github.com/facebook/lexical/blob/867d449b2a6497ff9b1fbdbd70724c74a1044d8b/packages/lexical-react/src/LexicalNodeEventPlugin.ts#L59C12-L67C8
    return editor.registerRootListener((rootElement, prevRootElement) => {
      rootElement?.addEventListener("blur", handleBlur);
      prevRootElement?.removeEventListener("blur", handleBlur);
    });
  }, [editor, handleChange]);

  return null;
};

const RemoveParagaphsPlugin = () => {
  const [editor] = useLexicalComposerContext();

  // register own commands before RichTextPlugin
  // to stop propagation
  useLayoutEffect(() => {
    const removeCommand = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        event?.preventDefault();
        // returns true which stops propagation
        return editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
      },
      COMMAND_PRIORITY_EDITOR
    );

    // merge pasted paragraphs into single one
    // and separate lines with line breaks
    const removeNodeTransform = editor.registerNodeTransform(
      RootNode,
      (node) => {
        // merge paragraphs into first with line breaks between
        if (node.getChildrenSize() > 1) {
          const children = node.getChildren();
          let first;
          for (let index = 0; index < children.length; index += 1) {
            const paragraph = children[index];
            // With default configuration root contains only paragraphs.
            // Lexical converts headings to paragraphs on paste for example.
            // So he we just check root children which are all paragraphs.
            if (paragraph instanceof ElementNode) {
              if (index === 0) {
                first = paragraph;
              } else if (first) {
                first.append($createLineBreakNode());
                for (const child of paragraph.getChildren()) {
                  first.append(child);
                }
                paragraph.remove();
              }
            }
          }
        }
      }
    );

    return () => {
      removeCommand();
      removeNodeTransform();
    };
  }, [editor]);

  return null;
};

const isSelectionLastNode = () => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return false;
  }

  const rootNode = $getRoot();
  const lastNode = rootNode.getLastDescendant();
  const anchor = selection.anchor;

  if ($isLineBreakNode(lastNode)) {
    const anchorNode = anchor.getNode();
    return (
      $isElementNode(anchorNode) &&
      anchorNode.getLastDescendant() === lastNode &&
      anchor.offset === anchorNode.getChildrenSize()
    );
  } else if ($isTextNode(lastNode)) {
    return (
      anchor.offset === lastNode.getTextContentSize() &&
      anchor.getNode() === lastNode
    );
  } else if ($isElementNode(lastNode)) {
    return (
      anchor.offset === lastNode.getChildrenSize() &&
      anchor.getNode() === lastNode
    );
  }

  return false;
};

const isSelectionFirstNode = () => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return false;
  }

  const rootNode = $getRoot();
  const firstNode = rootNode.getFirstDescendant();
  const anchor = selection.anchor;

  if ($isLineBreakNode(firstNode)) {
    const anchorNode = anchor.getNode();
    return (
      $isElementNode(anchorNode) &&
      anchorNode.getFirstDescendant() === firstNode &&
      anchor.offset === 0
    );
  } else if ($isTextNode(firstNode)) {
    return anchor.offset === 0 && anchor.getNode() === firstNode;
  } else if ($isElementNode(firstNode)) {
    return anchor.offset === 0 && anchor.getNode() === firstNode;
  }

  return false;
};

const getDomSelectionRect = () => {
  const domSelection = window.getSelection();
  if (!domSelection || !domSelection.focusNode) {
    return undefined;
  }

  // Get current line position
  const range = domSelection.getRangeAt(0);

  // The cursor position at the beginning of a line is technically associated with both:
  // The end of the previous line
  // The beginning of the current line
  // Select the rectangle for the current line. It typically appears as the last rect in the list.
  const rects = range.getClientRects();
  const currentRect = rects[rects.length - 1] ?? undefined;

  return currentRect;
};

const getVerticalIntersectionRatio = (rectA: DOMRect, rectB: DOMRect) => {
  const topIntersection = Math.max(rectA.top, rectB.top);
  const bottomIntersection = Math.min(rectA.bottom, rectB.bottom);
  const intersectionHeight = Math.max(0, bottomIntersection - topIntersection);
  const minHeight = Math.min(rectA.height, rectB.height);
  return minHeight === 0 ? 0 : intersectionHeight / minHeight;
};

const caretFromPoint = (
  x: number,
  y: number
): null | {
  offset: number;
  node: Node;
} => {
  if (typeof document.caretRangeFromPoint !== "undefined") {
    const range = document.caretRangeFromPoint(x, y);
    if (range === null) {
      return null;
    }
    return {
      node: range.startContainer,
      offset: range.startOffset,
    };
    // @ts-expect-error no types
  } else if (document.caretPositionFromPoint !== "undefined") {
    // @ts-expect-error no types
    const range = document.caretPositionFromPoint(x, y);
    if (range === null) {
      return null;
    }
    return {
      node: range.offsetNode,
      offset: range.offset,
    };
  } else {
    // Gracefully handle IE
    return null;
  }
};

const InitCursorPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const textEditingInstanceSelector = $textEditingInstanceSelector.get();
      if (textEditingInstanceSelector === undefined) {
        return;
      }

      const { reason } = textEditingInstanceSelector;

      if (reason === undefined) {
        return;
      }

      if (reason === "click") {
        const { mouseX, mouseY } = textEditingInstanceSelector;

        const eventRange = caretFromPoint(mouseX, mouseY);

        if (eventRange !== null) {
          const { offset: domOffset, node: domNode } = eventRange;
          const node = $getNearestNodeFromDOMNode(domNode);

          if (node !== null) {
            const selection = $createRangeSelection();
            if ($isTextNode(node)) {
              selection.anchor.set(node.getKey(), domOffset, "text");
              selection.focus.set(node.getKey(), domOffset, "text");
            } else {
              const parentKey = node.getParentOrThrow().getKey();
              const offset = node.getIndexWithinParent() + 1;
              selection.anchor.set(parentKey, offset, "element");
              selection.focus.set(parentKey, offset, "element");
            }

            const normalizedSelection =
              $normalizeSelection__EXPERIMENTAL(selection);
            $setSelection(normalizedSelection);
          }
        }
        return;
      }

      if (reason === "down" || reason === "right" || reason === "enter") {
        const selection = $createRangeSelection();
        const firstNode = $getRoot().getFirstDescendant();

        if (firstNode && $isTextNode(firstNode)) {
          selection.anchor.set(firstNode.getKey(), 0, "text");
          selection.focus.set(firstNode.getKey(), 0, "text");
          $setSelection(selection);
        }
        return;
      }

      if (reason === "up" || reason === "left") {
        const selection = $createRangeSelection();
        const lastNode = $getRoot().getLastDescendant();

        if (lastNode && $isTextNode(lastNode)) {
          selection.anchor.set(
            lastNode.getKey(),
            lastNode.getTextContentSize(),
            "text"
          );
          selection.focus.set(
            lastNode.getKey(),
            lastNode.getTextContentSize(),
            "text"
          );
          $setSelection(selection);
        }

        return;
      }

      reason satisfies never;
    });
  }, [editor]);

  return null;
};

type HandleNextArgs =
  | {
      reason: "up" | "down";
      cursorX: number;
    }
  | {
      reason: "right" | "left";
    };

type SwitchBlockPluginProps = {
  onNext: (args: HandleNextArgs) => void;
};

const SwitchBlockPlugin = ({ onNext }: SwitchBlockPluginProps) => {
  const [editor] = useLexicalComposerContext();
  const selectionPoint =
    useRef<
      [
        type: "up" | "down",
        time: number,
        selection: RangeSelection,
        rect: DOMRect,
      ]
    >();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      (event) => {
        const selection = $getSelection();
        selectionPoint.current = undefined;

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const isLast = isSelectionLastNode();

        if (isLast) {
          onNext({ reason: "right" });
          event?.preventDefault();
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onNext]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      (event) => {
        const selection = $getSelection();
        selectionPoint.current = undefined;

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const isFirst = isSelectionFirstNode();

        if (isFirst) {
          onNext({ reason: "left" });
          event?.preventDefault();
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onNext]);

  // To detect UP/Down key events on the first/last edited line, we use the following trick:
  // When pressing UP/Down on the first/last line, the native cursor moves to the start/end of the text.
  // We detect this movement when the cursor rect moves horizontally to the start/end and restore the cursor position,
  // then trigger onPrevious/onNext accordingly.
  useEffect(() => {
    return editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        const selection = $getSelection();
        selectionPoint.current = undefined;

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const isLast = isSelectionLastNode();

        const rect = getDomSelectionRect();
        if (isLast) {
          onNext({ reason: "down", cursorX: rect?.x ?? 0 });
          event?.preventDefault();
          return true;
        }

        if (rect === undefined) {
          return false;
        }

        selectionPoint.current = ["down", Date.now(), selection.clone(), rect];

        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, onNext]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        const selection = $getSelection();
        selectionPoint.current = undefined;

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const isFirst = isSelectionFirstNode();
        const rect = getDomSelectionRect();

        if (isFirst) {
          onNext({ reason: "up", cursorX: rect?.x ?? 0 });
          event?.preventDefault();
          return true;
        }

        if (rect === undefined) {
          return false;
        }

        selectionPoint.current = ["up", Date.now(), selection.clone(), rect];

        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, onNext]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        if (selectionPoint.current === undefined) {
          return false;
        }

        const [type, time, savedSelection, savedRect] = selectionPoint.current;

        if (Date.now() - time > 100) {
          return false;
        }

        selectionPoint.current = undefined;

        const isFirstOrLast =
          type === "up" ? isSelectionFirstNode() : isSelectionLastNode();
        const rect = getDomSelectionRect();

        if (
          isFirstOrLast &&
          rect !== undefined &&
          getVerticalIntersectionRatio(rect, savedRect) > 0.5
        ) {
          $setSelection(savedSelection);

          onNext({ reason: type, cursorX: savedRect.x });
        }

        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, onNext]);

  return null;
};

const onError = (error: Error) => {
  throw error;
};

type TextEditorProps = {
  rootInstanceSelector: InstanceSelector;
  instances: Instances;
  contentEditable: JSX.Element;
  editable?: boolean;
  onChange: (instancesList: Instance[]) => void;
  onSelectInstance: (instanceId: Instance["id"]) => void;
};

const mod = (n: number, m: number) => {
  return ((n % m) + m) % m;
};

export const TextEditor = ({
  rootInstanceSelector,
  instances,
  contentEditable,
  editable,
  onChange,
  onSelectInstance,
}: TextEditorProps) => {
  // class names must be started with letter so we add a prefix
  const [paragraphClassName] = useState(() => `a${nanoid()}`);
  const [italicClassName] = useState(() => `a${nanoid()}`);

  useLayoutEffect(() => {
    const sheet = createRegularStyleSheet({ name: "text-editor" });

    // reset paragraph styles and make it work inside <a>
    sheet.addPlaintextRule(`
      .${paragraphClassName} { display: inline-block; margin: 0; }
    `);
    /// set italic style for bold italic combination on the same element
    sheet.addPlaintextRule(`
      .${italicClassName} { font-style: italic; }
    `);
    sheet.render();
    return () => {
      sheet.unmount();
    };
  }, [paragraphClassName, italicClassName]);

  // store references separately because lexical nodes
  // cannot store custom data
  // Map<nodeKey, Instance>
  const [refs] = useState<Refs>(() => new Map());
  const initialConfig = {
    namespace: "WsTextEditor",
    theme: {
      paragraph: paragraphClassName,
      text: {
        italic: italicClassName,
      },
    },
    editable,
    editorState: () => {
      const [rootInstanceId] = rootInstanceSelector;
      // text editor is unmounted when change properties in side panel
      // so assume new nodes don't need to preserve instance id
      // and store only initial references
      $convertToLexical(instances, rootInstanceId, refs);
    },
    nodes: [LinkNode],
    onError,
  };

  const handleNext = useCallback(
    (args: HandleNextArgs) => {
      const rootInstanceId = $selectedPage.get()?.rootInstanceId;

      if (rootInstanceId === undefined) {
        return;
      }

      const results: InstanceSelector[] = [];
      findAllEditableInstanceSelector(
        rootInstanceId,
        [],
        instances,
        $registeredComponentMetas.get(),
        results
      );

      const currentIndex = results.findIndex((instanceSelector) => {
        return (
          instanceSelector[0] === rootInstanceSelector[0] &&
          instanceSelector.join(",") === rootInstanceSelector.join(",")
        );
      });

      if (currentIndex === -1) {
        return;
      }

      const nextIndex =
        args.reason === "down" || args.reason === "right"
          ? mod(currentIndex + 1, results.length)
          : mod(currentIndex - 1, results.length);

      $textEditingInstanceSelector.set({
        selector: results[nextIndex],
        ...args,
      });
      $selectedInstanceSelector.set(results[nextIndex]);
    },
    [instances, rootInstanceSelector]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <AutofocusPlugin />

      <RemoveParagaphsPlugin />
      <CaretColorPlugin />
      <ToolbarConnectorPlugin
        onSelectNode={(nodeKey) => {
          const instanceId = refs.get(`${nodeKey}:span`);
          if (instanceId !== undefined) {
            onSelectInstance(instanceId);
          }
        }}
      />
      <BindInstanceToNodePlugin refs={refs} />
      <RichTextPlugin
        ErrorBoundary={LexicalErrorBoundary}
        contentEditable={contentEditable}
        placeholder={<></>}
      />
      <LinkPlugin />
      <HistoryPlugin />

      <SwitchBlockPlugin onNext={handleNext} />
      <OnChangeOnBlurPlugin
        onChange={(editorState) => {
          editorState.read(() => {
            const treeRootInstance = instances.get(rootInstanceSelector[0]);
            if (treeRootInstance) {
              onChange($convertToUpdates(treeRootInstance, refs));
            }
          });
        }}
      />
      <InitCursorPlugin />
    </LexicalComposer>
  );
};
