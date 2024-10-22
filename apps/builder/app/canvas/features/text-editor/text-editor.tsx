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
  $isLineBreakNode,
  COMMAND_PRIORITY_LOW,
  $setSelection,
  $getRoot,
  $isTextNode,
  $isElementNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  $createRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  $getNearestNodeFromDOMNode,
  // eslint-disable-next-line camelcase
  $normalizeSelection__EXPERIMENTAL,
  type LexicalEditor,
  type SerializedEditorState,
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
import { collapsedAttribute, idAttribute } from "@webstudio-is/react-sdk";
import type { InstanceSelector } from "~/shared/tree-utils";
import { ToolbarConnectorPlugin } from "./toolbar-connector";
import { type Refs, $convertToLexical, $convertToUpdates } from "./interop";
import { colord } from "colord";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import { findAllEditableInstanceSelector } from "~/shared/instance-utils";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedPage,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";
import {
  getElementByInstanceSelector,
  getVisibleElementsByInstanceSelector,
} from "~/shared/dom-utils";
import deepEqual from "fast-deep-equal";

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

/**
 * Select all TEXT nodes inside editor root, then find the top and bottom rects
 */
const getTopBottomRects = (
  editor: LexicalEditor
): [topRects: DOMRect[], bottomRects: DOMRect[]] => {
  const rootElement = editor.getElementByKey($getRoot().getKey());
  if (rootElement == null) {
    return [[], []];
  }

  const walker = document.createTreeWalker(
    rootElement,
    NodeFilter.SHOW_TEXT,
    null
  );

  const allRects: DOMRect[] = [];

  while (walker.nextNode()) {
    const range = document.createRange();
    range.selectNodeContents(walker.currentNode);
    const rects = range.getClientRects();
    allRects.push(...Array.from(rects));
  }

  if (allRects.length === 0) {
    return [[], []];
  }

  const topRect = Array.from(allRects).sort((a, b) => a.top - b.top)[0];

  const bottomRect = Array.from(allRects).sort(
    (a, b) => b.bottom - a.bottom
  )[0];

  const topRects = allRects.filter(
    (rect) => getVerticalIntersectionRatio(rect, topRect) > 0.5
  );
  const bottomRects = allRects.filter(
    (rect) => getVerticalIntersectionRatio(rect, bottomRect) > 0.5
  );

  return [topRects, bottomRects];
};

const InitCursorPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.isEditable()) {
      return;
    }

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
            }
            const normalizedSelection =
              $normalizeSelection__EXPERIMENTAL(selection);
            $setSelection(normalizedSelection);
          }
        }
        return;
      }

      while (reason === "down" || reason === "up") {
        const { cursorX } = textEditingInstanceSelector;

        const [topRects, bottomRects] = getTopBottomRects(editor);

        // Smoodge the cursor a little to the left and right to find the nearest text node
        const smoodgeOffsets = [1, 2, 4];
        const maxOffset = Math.max(...smoodgeOffsets);

        const rects = reason === "down" ? topRects : bottomRects;

        rects.sort((a, b) => a.left - b.left);

        const rectWithText = rects.find(
          (rect, index) =>
            rect.left - (index === 0 ? maxOffset : 0) <= cursorX &&
            cursorX <= rect.right + (index === rects.length - 1 ? maxOffset : 0)
        );

        if (rectWithText === undefined) {
          break;
        }

        const newCursorY = rectWithText.top + rectWithText.height / 2;

        const eventRanges = [caretFromPoint(cursorX, newCursorY)];
        for (const offset of smoodgeOffsets) {
          eventRanges.push(caretFromPoint(cursorX - offset, newCursorY));
          eventRanges.push(caretFromPoint(cursorX + offset, newCursorY));
        }

        for (const eventRange of eventRanges) {
          if (eventRange === null) {
            continue;
          }

          const { offset: domOffset, node: domNode } = eventRange;
          const node = $getNearestNodeFromDOMNode(domNode);

          if (node !== null && $isTextNode(node)) {
            const selection = $createRangeSelection();
            selection.anchor.set(node.getKey(), domOffset, "text");
            selection.focus.set(node.getKey(), domOffset, "text");
            const normalizedSelection =
              $normalizeSelection__EXPERIMENTAL(selection);
            $setSelection(normalizedSelection);

            return;
          }
        }

        /*
        // Debug rects do not delete.

        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.top = "0";
        container.style.left = "0";
        container.style.pointerEvents = "none";
        container.style.zIndex = "9999";
        document.body.appendChild(container);

        Array.from(rects).forEach((rect, index) => {
          const debugRect = document.createElement("div");

          debugRect.className = `debug-rect-${index}`;

          Object.assign(debugRect.style, {
            position: "fixed",
            border: "1px solid red",
            backgroundColor: "rgba(255, 0, 0, 0.1)",
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            zIndex: "9999",
            pointerEvents: "none",
          });
          container.appendChild(debugRect);
        });
        */

        break;
      }

      if (reason === "down" || reason === "right" || reason === "enter") {
        const firstNode = $getRoot().getFirstDescendant();

        if (firstNode === null) {
          return;
        }

        if ($isTextNode(firstNode)) {
          const selection = $createRangeSelection();
          selection.anchor.set(firstNode.getKey(), 0, "text");
          selection.focus.set(firstNode.getKey(), 0, "text");
          $setSelection(selection);
        }

        if ($isLineBreakNode(firstNode)) {
          // Set selection on start
          const selection = $createRangeSelection();
          $setSelection(selection);
        }

        return;
      }

      if (reason === "up" || reason === "left") {
        const selection = $createRangeSelection();
        const lastNode = $getRoot().getLastDescendant();

        if (lastNode === null) {
          return;
        }

        if ($isTextNode(lastNode)) {
          const contentSize = lastNode.getTextContentSize();
          selection.anchor.set(lastNode.getKey(), contentSize, "text");
          selection.focus.set(lastNode.getKey(), contentSize, "text");
          $setSelection(selection);
        }

        return;
      }

      reason satisfies never;
    });
  }, [editor]);

  return null;
};

type HandleNextParams =
  | {
      reason: "up" | "down";
      cursorX: number;
    }
  | {
      reason: "right" | "left";
    };

type SwitchBlockPluginProps = {
  onNext: (editorState: EditorState, params: HandleNextParams) => void;
};

const SwitchBlockPlugin = ({ onNext }: SwitchBlockPluginProps) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const isLast = isSelectionLastNode();

        if (isLast) {
          const state = editor.getEditorState();
          onNext(state, { reason: "right" });
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

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const isFirst = isSelectionFirstNode();

        if (isFirst) {
          const state = editor.getEditorState();
          onNext(state, { reason: "left" });
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
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const isLast = isSelectionLastNode();

        const rect = getDomSelectionRect();

        if (isLast) {
          const state = editor.getEditorState();
          onNext(state, { reason: "down", cursorX: rect?.x ?? 0 });
          event?.preventDefault();
          return true;
        }

        if (rect === undefined) {
          return false;
        }

        const rootNode = $getRoot();
        const lastNode = rootNode.getLastDescendant();
        if ($isLineBreakNode(lastNode)) {
          return false;
        }

        const [, lineRects] = getTopBottomRects(editor);

        const cursorY = rect.y + rect.height / 2;

        if (
          lineRects.some(
            (lineRect) =>
              lineRect.left <= rect.x &&
              rect.x <= lineRect.right &&
              lineRect.top <= cursorY &&
              cursorY <= lineRect.bottom
          )
        ) {
          const state = editor.getEditorState();
          onNext(state, { reason: "down", cursorX: rect?.x ?? 0 });
          event?.preventDefault();
          return true;
        }

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

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const isFirst = isSelectionFirstNode();
        const rect = getDomSelectionRect();

        if (isFirst) {
          const state = editor.getEditorState();
          onNext(state, { reason: "up", cursorX: rect?.x ?? 0 });
          event?.preventDefault();
          return true;
        }

        if (rect === undefined) {
          return false;
        }

        const rootNode = $getRoot();
        const lastNode = rootNode.getFirstDescendant();
        if ($isLineBreakNode(lastNode)) {
          return false;
        }

        const [lineRects] = getTopBottomRects(editor);

        const cursorY = rect.y + rect.height / 2;

        if (
          lineRects.some(
            (lineRect) =>
              lineRect.left <= rect.x &&
              rect.x <= lineRect.right &&
              lineRect.top <= cursorY &&
              cursorY <= lineRect.bottom
          )
        ) {
          const state = editor.getEditorState();
          onNext(state, { reason: "up", cursorX: rect?.x ?? 0 });
          event?.preventDefault();
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL
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

const InitialJSONStatePlugin = ({
  onInitialState,
}: {
  onInitialState: (json: SerializedEditorState) => void;
}) => {
  const [editor] = useLexicalComposerContext();
  const handleInitialState = useEffectEvent(onInitialState);

  useEffect(() => {
    handleInitialState(editor.getEditorState().toJSON());
  }, [editor, handleInitialState]);

  return null;
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
  const lastSavedStateJsonRef = useRef<SerializedEditorState | null>(null);

  const handleChange = useEffectEvent((editorState: EditorState) => {
    editorState.read(() => {
      const treeRootInstance = instances.get(rootInstanceSelector[0]);
      if (treeRootInstance) {
        const jsonState = editorState.toJSON();
        if (deepEqual(jsonState, lastSavedStateJsonRef.current)) {
          return;
        }

        onChange($convertToUpdates(treeRootInstance, refs));
        lastSavedStateJsonRef.current = jsonState;
      }
    });
  });

  useLayoutEffect(() => {
    const sheet = createRegularStyleSheet({ name: "text-editor" });

    // reset paragraph styles and make it work inside <a>
    sheet.addPlaintextRule(`
      .${paragraphClassName} { display: inline-block; margin: 0; }
    `);

    // fixes the bug on canvas that cursor is not shown on empty elements
    sheet.addPlaintextRule(`
      .${paragraphClassName}:has(br):not(:has(:not(br))) { min-width: 1px; }
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
    (state: EditorState, args: HandleNextParams) => {
      const rootInstanceId = $selectedPage.get()?.rootInstanceId;

      const instances = $instances.get();

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

      for (let i = 1; i < results.length; i++) {
        const nextIndex =
          args.reason === "down" || args.reason === "right"
            ? mod(currentIndex + i, results.length)
            : mod(currentIndex - i, results.length);

        const nextSelector = results[nextIndex];

        if (getVisibleElementsByInstanceSelector(nextSelector).length > 0) {
          const instance = instances.get(nextSelector[0]);

          // opnionated: Elements without children can be spacers, so skip them if not collapsed.
          if (instance?.children.length === 0) {
            const elt = getElementByInstanceSelector(nextSelector);
            if (elt === undefined) {
              continue;
            }

            if (!elt.hasAttribute(collapsedAttribute)) {
              continue;
            }
          }

          handleChange(state);

          $textEditingInstanceSelector.set({
            selector: results[nextIndex],
            ...args,
          });

          $selectedInstanceSelector.set(results[nextIndex]);
          break;
        }
      }
    },
    [handleChange, rootInstanceSelector]
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
      <OnChangeOnBlurPlugin onChange={handleChange} />
      <InitCursorPlugin />
      <InitialJSONStatePlugin
        onInitialState={(json) => {
          lastSavedStateJsonRef.current = json;
        }}
      />
    </LexicalComposer>
  );
};
