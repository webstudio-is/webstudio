import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  type JSX,
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
  $createTextNode,
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  type NodeKey,
  $getNodeByKey,
  SELECTION_CHANGE_COMMAND,
  $selectAll,
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
import {
  collapsedAttribute,
  idAttribute,
  selectorIdAttribute,
} from "@webstudio-is/react-sdk";
import { isDescendantOrSelf, type InstanceSelector } from "~/shared/tree-utils";
import { ToolbarConnectorPlugin } from "./toolbar-connector";
import { type Refs, $convertToLexical, $convertToUpdates } from "./interop";
import { colord } from "colord";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import {
  deleteInstanceMutable,
  findAllEditableInstanceSelector,
  updateWebstudioData,
} from "~/shared/instance-utils";
import {
  $blockChildOutline,
  $hoveredInstanceOutline,
  $hoveredInstanceSelector,
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
  $textEditorContextMenu,
  execTextEditorContextMenuCommand,
  findBlockChildSelector,
  findTemplates,
} from "~/shared/nano-states";
import {
  getElementByInstanceSelector,
  getVisibleElementsByInstanceSelector,
} from "~/shared/dom-utils";
import deepEqual from "fast-deep-equal";
import { setDataCollapsed } from "~/canvas/collapsed";
import {
  $selectedPage,
  addTemporaryInstance,
  getInstancePath,
  selectInstance,
} from "~/shared/awareness";
import { shallowEqual } from "shallow-equal";
import {
  insertListItemAt,
  insertTemplateAt,
} from "~/builder/features/workspace/canvas-tools/outline/block-utils";

const BindInstanceToNodePlugin = ({
  refs,
  rootInstanceSelector,
}: {
  refs: Refs;
  rootInstanceSelector: InstanceSelector;
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    for (const [nodeKey, instanceId] of refs) {
      // extract key from stored key:style format
      const [key] = nodeKey.split(":");
      const element = editor.getElementByKey(key);
      if (element) {
        element.setAttribute(idAttribute, instanceId);
        // We set id + root selector here, for simplicity
        // This solves hover behavior during mouseMove for editable child outline
        // @todo: A normal selector must be used, but it would require significantly more code to detect the tree structure.
        element.setAttribute(
          selectorIdAttribute,
          [instanceId, ...rootInstanceSelector].join(",")
        );
      }
    }
  }, [editor, refs, rootInstanceSelector]);
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

const isChrome = () =>
  navigator.userAgentData?.brands.some(
    (brand) => brand.brand === "Google Chrome"
  );

const OnChangeOnBlurPlugin = ({
  onChange,
}: {
  onChange: (editorState: EditorState, reason: "blur" | "unmount") => void;
}) => {
  const [editor] = useLexicalComposerContext();
  const handleChange = useEffectEvent(onChange);

  useEffect(
    () => () => {
      // Ensures editable content is saved if no blur event occurs before unmount.
      // This can happen in Firefox and Safari.
      // To reproduce: create a Content Block, edit a paragraph, then type `/` and select Heading or Paragraph from the menu.
      // Without this, changes may be lost on unmount in FF and Safari.

      if (isChrome()) {
        // Fixes an issue in DEV MODE where, if text is center-aligned inside Flex/Grid,
        // the code below causes Chrome to scroll the editable text block to the center of the view.
        return;
      }
      // The issue is related to React’s development mode.
      // When we set the initial selection in the Editor, we disable Lexical’s internal
      // scrolling using the update operation tag tag: "skip-scroll-into-view".
      // The problem is that a read operation forces all pending update operations to commit,
      // and for some reason, this forced commit does not respect tags.
      // In React’s development mode, useEffect runs twice, which causes scrollIntoView
      // to be called during the first read.
      // To prevent this, we disconnect the editor from the DOM
      // by setting editor._rootElement = null;.
      // This makes Lexical assume it’s in headless mode,
      // preventing it from executing DOM operations.
      editor._rootElement = null;

      // Safari and FF support as no blur event is triggered in some cases
      editor.read(() => {
        handleChange(editor.getEditorState(), "unmount");
      });
    },
    [editor, handleChange]
  );

  useEffect(() => {
    const handleBlur = () => {
      // force read to get the latest state
      editor.read(() => {
        handleChange(editor.getEditorState(), "blur");
      });
    };

    // https://github.com/facebook/lexical/blob/867d449b2a6497ff9b1fbdbd70724c74a1044d8b/packages/lexical-react/src/LexicalNodeEventPlugin.ts#L59C12-L67C8
    return editor.registerRootListener((rootElement, prevRootElement) => {
      rootElement?.addEventListener("blur", handleBlur);
      prevRootElement?.removeEventListener("blur", handleBlur);
    });
  }, [editor, handleChange]);

  return null;
};

const getNodeKeyFromDOMNode = (
  dom: Node,
  editor: LexicalEditor
): NodeKey | undefined => {
  const prop = `__lexicalKey_${editor._key}`;
  return (dom as Node & Record<typeof prop, NodeKey | undefined>)[prop];
};

const LinkSelectionPlugin = ({
  rootInstanceSelector,
  registerNewLink,
}: {
  rootInstanceSelector: InstanceSelector;
  registerNewLink: (key: NodeKey, instanceId: string) => void;
}) => {
  const [editor] = useLexicalComposerContext();
  const [preservedSelection] = useState(rootInstanceSelector);

  useEffect(() => {
    if (!editor.isEditable()) {
      return;
    }

    const removeUpdateListener = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => {
          const selectedInstanceSelector = $selectedInstanceSelector.get();

          if (selectedInstanceSelector === undefined) {
            return;
          }

          if (
            !isDescendantOrSelf(selectedInstanceSelector, preservedSelection)
          ) {
            return;
          }

          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }
          const key = selection.anchor.getNode().getKey();

          const elt = editor.getElementByKey(key);
          let link = elt?.closest(`a[${selectorIdAttribute}]`);
          const newLink = elt?.closest(`a`);

          while (newLink != null && link == null) {
            // new link detected

            // https://github.com/facebook/lexical/blob/b7fa4cf673869dac0c2e0c1fe667e71e72ff6adb/packages/lexical/src/LexicalUtils.ts#L465
            const key = getNodeKeyFromDOMNode(newLink, editor);
            if (key === undefined) {
              console.error("Key not found for node", newLink);
              break;
            }

            // Register new link
            const instanceId = nanoid();

            newLink.setAttribute(idAttribute, instanceId);
            // We set id + root selector here, for simplicity
            // This solves hover behavior during mouseMove for editable child outline
            // @todo: A normal selector must be used, but it would require significantly more code to detect the tree structure.
            newLink.setAttribute(
              selectorIdAttribute,
              [instanceId, ...rootInstanceSelector].join(",")
            );

            registerNewLink(key, instanceId);

            link = newLink;

            break;
          }

          if (link == null) {
            if (
              shallowEqual(preservedSelection, $selectedInstanceSelector.get())
            ) {
              return false;
            }

            selectInstance(preservedSelection);

            return false;
          }

          const selectorAttribute = link
            .getAttribute(selectorIdAttribute)
            ?.split(",");

          if (selectorAttribute === undefined) {
            return false;
          }

          if (
            shallowEqual(selectorAttribute, $selectedInstanceSelector.get())
          ) {
            return false;
          }

          selectInstance(selectorAttribute);
        });
      }
    );

    return () => {
      removeUpdateListener();
    };
  }, [editor, preservedSelection, registerNewLink, rootInstanceSelector]);

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
  } else if (typeof document.caretPositionFromPoint !== "undefined") {
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

    editor.update(
      () => {
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
                const normalizedSelection =
                  $normalizeSelection__EXPERIMENTAL(selection);

                $setSelection(normalizedSelection);
                return;
              }
            }

            if (domNode instanceof Element) {
              const rect = domNode.getBoundingClientRect();
              if (mouseX > rect.right) {
                const selection = $getRoot().selectEnd();
                $setSelection(selection);
                return;
              }
            }
          }
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
              cursorX <=
                rect.right + (index === rects.length - 1 ? maxOffset : 0)
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

          break;
        }

        if (
          reason === "down" ||
          reason === "right" ||
          reason === "enter" ||
          reason === "click"
        ) {
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

          if ($isElementNode(firstNode)) {
            // e.g. Box is empty
            const selection = $createRangeSelection();
            selection.anchor.set(firstNode.getKey(), 0, "element");
            selection.focus.set(firstNode.getKey(), 0, "element");
            $setSelection(selection);
          }

          if ($isLineBreakNode(firstNode)) {
            // e.g. Box contains 2+ empty lines
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

          if ($isElementNode(lastNode)) {
            // e.g. Box is empty
            const selection = $createRangeSelection();
            selection.anchor.set(lastNode.getKey(), 0, "element");
            selection.focus.set(lastNode.getKey(), 0, "element");
            $setSelection(selection);
          }

          if ($isLineBreakNode(lastNode)) {
            // e.g. Box contains 2+ empty lines
            const parent = lastNode.getParent();
            if ($isElementNode(parent)) {
              const selection = $createRangeSelection();
              selection.anchor.set(
                parent.getKey(),
                parent.getChildrenSize(),
                "element"
              );
              selection.focus.set(
                parent.getKey(),
                parent.getChildrenSize(),
                "element"
              );
              $setSelection(selection);
            }
          }

          return;
        }
        if (reason === "new") {
          $selectAll();
          return;
        }

        reason satisfies never;
      },
      {
        // We are controlling scroll ourself in instance-selected.ts see updateScroll.
        // Without skipping we are getting side effects of composition in scrollBy, scrollIntoView calls
        tag: "skip-scroll-into-view",
      }
    );
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

const isSingleCursorSelection = () => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return false;
  }
  const isCaret =
    selection.anchor.offset === selection.focus.offset &&
    selection.anchor.key === selection.focus.key;

  if (!isCaret) {
    return false;
  }

  return true;
};

const SwitchBlockPlugin = ({ onNext }: SwitchBlockPluginProps) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // The right arrow key should move the cursor to the next block only if it is at the end of the current block.
    return editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      (event) => {
        if (!isSingleCursorSelection()) {
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
    // The left arrow key should move the cursor to the previous block only if it is at the start of the current block.
    return editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      (event) => {
        if (!isSingleCursorSelection()) {
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
    // The down arrow key should move the cursor to the next block if:
    // - it is at the end of the current block
    // - the cursor is at the last line of the current block
    return editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        if (!isSingleCursorSelection()) {
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

        // Check if the cursor is inside a rectangle on the last line
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
    // The up arrow key should move the cursor to the previous block if:
    // - it is at the start of the current block
    // - the cursor is at the first line of the current block
    return editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        if (!isSingleCursorSelection()) {
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

        // Lexical has a bug where the cursor sometimes stops moving up.
        // Slight adjustments fix this issue.
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        selection.modify("move", false, "character");
        selection.modify("move", true, "character");

        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, onNext]);

  return null;
};

type ContextMenuParams = {
  cursorRect: DOMRect;
};

type RichTextContentPluginProps = {
  rootInstanceSelector: InstanceSelector;
  onOpen: (
    editorState: EditorState,
    params: undefined | ContextMenuParams
  ) => void;
  onNext: (editorState: EditorState, params: HandleNextParams) => void;
};

const RichTextContentPlugin = (props: RichTextContentPluginProps) => {
  const [templates] = useState(() =>
    findTemplates(props.rootInstanceSelector, $instances.get())
  );

  if (templates === undefined) {
    return;
  }

  if (templates.length === 0) {
    return;
  }

  return <RichTextContentPluginInternal {...props} templates={templates} />;
};

const RichTextContentPluginInternal = ({
  rootInstanceSelector,
  onOpen,
  templates,
  onNext,
}: RichTextContentPluginProps & {
  templates: [instance: Instance, instanceSelector: InstanceSelector][];
}) => {
  const [editor] = useLexicalComposerContext();
  const [preservedSelection] = useState(rootInstanceSelector);

  const handleOpen = useEffectEvent(onOpen);

  useEffect(() => {
    if (!editor.isEditable()) {
      return;
    }

    let menuState: "closed" | "opening" | "opened" = "closed";

    let slashNodeKey: NodeKey | undefined = undefined;

    const closeMenu = () => {
      if (menuState === "closed") {
        return;
      }

      menuState = "closed";

      handleOpen(editor.getEditorState(), undefined);

      if (slashNodeKey === undefined) {
        return;
      }

      const node = $getNodeByKey(slashNodeKey);

      if ($isTextNode(node)) {
        node.setStyle("");
      }

      const selectedInstanceSelector = $selectedInstanceSelector.get();

      const isSelectionInSameComponent = selectedInstanceSelector
        ? isDescendantOrSelf(selectedInstanceSelector, preservedSelection)
        : false;

      if (!isSelectionInSameComponent) {
        node?.remove();

        // Delete current
        if ($getRoot().getTextContentSize() === 0) {
          const blockChildSelector =
            findBlockChildSelector(rootInstanceSelector);

          if (blockChildSelector) {
            updateWebstudioData((data) => {
              deleteInstanceMutable(
                data,
                getInstancePath(rootInstanceSelector, data.instances)
              );
            });
          }
        }
      }

      // if selection changed, remove the slash node

      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return;
      }

      selection.setStyle("");
    };

    const unsubscibeSelectionChange = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        if (menuState !== "opened") {
          return false;
        }

        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          closeMenu();
          return false;
        }

        if (selection.anchor.key !== slashNodeKey) {
          closeMenu();
          return false;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    const unsubscibeKeyDown = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        if (event.key === "Backspace" || event.key === "Delete") {
          if ($getRoot().getTextContentSize() === 0) {
            const currentInstance = $instances
              .get()
              .get(rootInstanceSelector[0]);

            if (currentInstance?.component === "ListItem") {
              onNext(editor.getEditorState(), { reason: "left" });

              const parentInstanceSelector = rootInstanceSelector.slice(1);
              const parentInstance = $instances
                .get()
                .get(parentInstanceSelector[0]);

              const isLastChild = parentInstance?.children.length === 1;

              updateWebstudioData((data) => {
                deleteInstanceMutable(
                  data,
                  getInstancePath(
                    isLastChild ? parentInstanceSelector : rootInstanceSelector,
                    data.instances
                  )
                );
              });

              event.preventDefault();
              return true;
            }

            const blockChildSelector =
              findBlockChildSelector(rootInstanceSelector);

            if (blockChildSelector) {
              onNext(editor.getEditorState(), { reason: "left" });

              updateWebstudioData((data) => {
                deleteInstanceMutable(
                  data,
                  getInstancePath(blockChildSelector, data.instances)
                );
              });

              event.preventDefault();
              return true;
            }
          }
        }

        if (menuState === "closed") {
          if (event.key === "Enter" && !event.shiftKey) {
            // Custom logic if we are editing ListItem
            const currentInstance = $instances
              .get()
              .get(rootInstanceSelector[0]);

            if (
              currentInstance?.component === "ListItem" &&
              $getRoot().getTextContentSize() > 0
            ) {
              // Instead of creating block component we need to add a new ListItem
              insertListItemAt(rootInstanceSelector);
              event.preventDefault();
              return true;
            }

            // Check if it pressed on the last line, last symbol

            const allowedComponents = ["Paragraph", "Text", "Heading"];

            for (const component of allowedComponents) {
              const templateSelector = templates.find(
                ([instance]) => instance.component === component
              )?.[1];

              if (templateSelector === undefined) {
                continue;
              }

              /*
              @todo Split logic idea
              // clone root node then

              // getPreviousSibling
              const removeNextSiblings = (node: LexicalNode) => {
                let current: LexicalNode | null = node;
                while (current) {
                  const next = current.getNextSibling();
                  if (next) {
                    next.remove();
                    continue;
                  }
                  // Move up to parent and continue removing siblings

                  current = current.getParent();

                  if ($isRootNode(current)) {
                    break;
                  }
                }
              };

              const anchorNode = selection.anchor.getNode();
              const anchorOffset = selection.anchor.offset;

              if (!$isTextNode(anchorNode)) {
                continue;
              }
              anchorNode.splitText(anchorOffset);
              removeNextSiblings(anchorNode);

              */

              insertTemplateAt(templateSelector, rootInstanceSelector, false);

              if (
                currentInstance?.component === "ListItem" &&
                $getRoot().getTextContentSize() === 0
              ) {
                const parentInstanceSelector = rootInstanceSelector.slice(1);
                const parentInstance = $instances
                  .get()
                  .get(parentInstanceSelector[0]);

                const isLastChild = parentInstance?.children.length === 1;

                // Pressing Enter within an empty list item deletes the empty item
                updateWebstudioData((data) => {
                  deleteInstanceMutable(
                    data,
                    getInstancePath(
                      isLastChild
                        ? parentInstanceSelector
                        : rootInstanceSelector,
                      data.instances
                    )
                  );
                });
              }

              event.preventDefault();
              return true;
            }
          }
        }

        if (menuState === "opened") {
          if (event.key === "Escape") {
            closeMenu();
            event.preventDefault();
            return true;
          }

          if (event.key === " ") {
            closeMenu();
          }

          if (event.key === "/") {
            closeMenu();
          }

          if (event.key === "Enter") {
            execTextEditorContextMenuCommand({
              type: "enter",
            });

            event.preventDefault();
            return true;
          }

          if (event.key === "ArrowUp") {
            execTextEditorContextMenuCommand({
              type: "selectPrevious",
            });

            event.preventDefault();
            return true;
          }

          if (event.key === "ArrowDown") {
            execTextEditorContextMenuCommand({
              type: "selectNext",
            });

            event.preventDefault();
            return true;
          }
        }

        if (menuState === "closed") {
          if (event.key !== "/") {
            return false;
          }

          const slashNode = $createTextNode("/");
          slashNodeKey = slashNode.getKey();
          menuState = "opening";

          slashNode.setStyle("background-color: rgba(127, 127, 127, 0.2);");
          selection.setStyle("background-color: rgba(127, 127, 127, 0.2);");
          selection.insertNodes([slashNode]);

          event.preventDefault();
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );

    const closeMenuWithUpdate = () => {
      if (menuState === "closed") {
        return;
      }

      editor.update(() => {
        closeMenu();
      });
    };

    const unsubscribeUpdateListener = editor.registerUpdateListener(
      ({ editorState }) => {
        if (menuState === "opened") {
          editorState.read(() => {
            if (slashNodeKey === undefined) {
              closeMenu();
              return;
            }
            const node = $getNodeByKey(slashNodeKey);

            if (node === null) {
              closeMenuWithUpdate();
              return;
            }
            const content = node.getTextContent();

            const filter = content.slice(1);

            execTextEditorContextMenuCommand({
              type: "filter",
              value: filter,
            });
          });
        }

        if (menuState === "opening") {
          editorState.read(() => {
            if (slashNodeKey === undefined) {
              closeMenu();
              return;
            }

            const slashNode = editor.getElementByKey(slashNodeKey);

            if (slashNode === null) {
              closeMenu();
              return;
            }

            const rect = slashNode.getBoundingClientRect();

            menuState = "opened";

            handleOpen(editor.getEditorState(), {
              cursorRect: rect,
            });
          });
        }
      }
    );

    const unsubscribeBlurListener = editor.registerRootListener(
      (rootElement, prevRootElement) => {
        rootElement?.addEventListener("blur", closeMenuWithUpdate);
        prevRootElement?.removeEventListener("blur", closeMenuWithUpdate);
      }
    );

    return () => {
      unsubscibeKeyDown();
      unsubscribeUpdateListener();
      unsubscibeSelectionChange();
      unsubscribeBlurListener();
      // Safari and FF support as no blur event is triggered in some cases
      closeMenuWithUpdate();
    };
  }, [
    editor,
    handleOpen,
    onNext,
    preservedSelection,
    rootInstanceSelector,
    templates,
  ]);

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

/**
 * Removes link nodes and converts them to text nodes inside <a> elements.
 * Solves the issue with pasting from external sources that contain links.
 */
const LinkSanitizePlugin = (): null => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (rootElement === null) {
      return;
    }

    if (!(rootElement instanceof HTMLAnchorElement)) {
      return;
    }

    return editor.registerNodeTransform(LinkNode, (linkNode) => {
      linkNode.insertBefore($createTextNode(linkNode.getTextContent()));
      linkNode.remove();
    });
  }, [editor]);

  return null;
};

const AnyKeyDownPlugin = ({
  onKeyDown,
}: {
  onKeyDown: (event: KeyboardEvent) => void;
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        onKeyDown(event);
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor, onKeyDown]);

  return null;
};

export const TextEditor = ({
  rootInstanceSelector: rootInstanceSelectorUnstable,
  instances,
  contentEditable,
  editable,
  onChange,
  onSelectInstance,
}: TextEditorProps) => {
  const [rootInstanceSelector] = useState(() => rootInstanceSelectorUnstable);
  // class names must be started with letter so we add a prefix
  const [paragraphClassName] = useState(() => `a${nanoid()}`);
  const [italicClassName] = useState(() => `a${nanoid()}`);
  const lastSavedStateJsonRef = useRef<SerializedEditorState | null>(null);
  const [newLinkKeyToInstanceId] = useState(() => new Map());

  const handleChange = useEffectEvent(
    (editorState: EditorState, reason: "blur" | "unmount" | "next") => {
      editorState.read(() => {
        const treeRootInstance = instances.get(rootInstanceSelector[0]);
        if (treeRootInstance) {
          const jsonState = editorState.toJSON();
          if (deepEqual(jsonState, lastSavedStateJsonRef.current)) {
            setDataCollapsed(rootInstanceSelector[0], false);
            return;
          }

          onChange(
            $convertToUpdates(treeRootInstance, refs, newLinkKeyToInstanceId)
          );
          newLinkKeyToInstanceId.clear();
          lastSavedStateJsonRef.current = jsonState;
        }

        setDataCollapsed(rootInstanceSelector[0], false);
      });

      const textEditingSelector = $textEditingInstanceSelector.get()?.selector;
      if (textEditingSelector === undefined) {
        return;
      }

      if (reason === "blur") {
        if (shallowEqual(textEditingSelector, rootInstanceSelector)) {
          $textEditingInstanceSelector.set(undefined);
        }
      }
    }
  );

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

  const handleNext = useEffectEvent(
    (state: EditorState, args: HandleNextParams) => {
      const rootInstanceId = $selectedPage.get()?.rootInstanceId;
      const metas = $registeredComponentMetas.get();

      if (rootInstanceId === undefined) {
        return;
      }

      const editableInstanceSelectors: InstanceSelector[] = [];
      findAllEditableInstanceSelector(
        [rootInstanceId],
        instances,
        metas,
        editableInstanceSelectors
      );

      const currentIndex = editableInstanceSelectors.findIndex(
        (instanceSelector) => {
          return (
            instanceSelector[0] === rootInstanceSelector[0] &&
            instanceSelector.join(",") === rootInstanceSelector.join(",")
          );
        }
      );

      if (currentIndex === -1) {
        return;
      }

      for (let i = 1; i < editableInstanceSelectors.length; i++) {
        const nextIndex =
          args.reason === "down" || args.reason === "right"
            ? mod(currentIndex + i, editableInstanceSelectors.length)
            : mod(currentIndex - i, editableInstanceSelectors.length);

        const nextSelector = editableInstanceSelectors[nextIndex];

        const nextInstance = instances.get(nextSelector[0]);
        if (nextInstance === undefined) {
          continue;
        }

        const hasExpressionChildren = nextInstance.children.some(
          (child) => child.type === "expression"
        );

        // opinionated: Skip if binded (double click is working)
        if (hasExpressionChildren) {
          continue;
        }

        // Skip invisible elements
        if (getVisibleElementsByInstanceSelector(nextSelector).length === 0) {
          continue;
        }

        const instance = instances.get(nextSelector[0]);

        if (instance === undefined) {
          continue;
        }
        const meta = metas.get(instance.component);

        // opinionated: Non-collapsed elements without children can act as spacers (they have size for some reason).
        if (
          // Components with pseudo-elements (e.g., ::marker) that prevent content from collapsing
          meta?.placeholder === undefined &&
          instance?.children.length === 0
        ) {
          const elt = getElementByInstanceSelector(nextSelector);

          if (elt === undefined) {
            continue;
          }

          if (!elt.hasAttribute(collapsedAttribute)) {
            continue;
          }
        }

        handleChange(state, "next");

        $textEditingInstanceSelector.set({
          selector: nextSelector,
          ...args,
        });

        selectInstance(nextSelector);

        break;
      }
    }
  );

  const handleAnyKeydown = useCallback((event: KeyboardEvent) => {
    // Skip alt as Block outline depends on Alt key press
    if (event.key === "Alt") {
      return;
    }

    $blockChildOutline.set(undefined);
    $hoveredInstanceOutline.set(undefined);
    $hoveredInstanceSelector.set(undefined);
  }, []);

  const registerNewLink = useCallback(
    (key: NodeKey, instanceId: string) => {
      newLinkKeyToInstanceId.set(key, instanceId);
      addTemporaryInstance({
        id: instanceId,
        component: "RichTextLink",
        type: "instance",
        children: [],
      });
    },
    [newLinkKeyToInstanceId]
  );

  const handleContextMenuOpen = useCallback(
    (_editorState: EditorState, params: undefined | ContextMenuParams) => {
      $textEditorContextMenu.set(params);
    },
    []
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
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
      <BindInstanceToNodePlugin
        refs={refs}
        rootInstanceSelector={rootInstanceSelector}
      />
      <RichTextPlugin
        ErrorBoundary={LexicalErrorBoundary}
        contentEditable={contentEditable}
      />
      <LinkPlugin />

      <LinkSanitizePlugin />
      <HistoryPlugin />

      <SwitchBlockPlugin onNext={handleNext} />
      <RichTextContentPlugin
        onOpen={handleContextMenuOpen}
        rootInstanceSelector={rootInstanceSelector}
        onNext={handleNext}
      />
      <OnChangeOnBlurPlugin onChange={handleChange} />
      <InitCursorPlugin />
      <LinkSelectionPlugin
        rootInstanceSelector={rootInstanceSelector}
        registerNewLink={registerNewLink}
      />
      <AnyKeyDownPlugin onKeyDown={handleAnyKeydown} />
      <InitialJSONStatePlugin
        onInitialState={(json) => {
          lastSavedStateJsonRef.current = json;
        }}
      />
    </LexicalComposer>
  );
};
