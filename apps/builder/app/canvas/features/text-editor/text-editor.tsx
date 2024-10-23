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

type SwitchBlockPluginProps = {
  onNext: () => void;
  onPrevious: () => void;
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
  const currentRect = range.getBoundingClientRect();
  return currentRect;
};

const getVerticalIntersectionRatio = (rectA: DOMRect, rectB: DOMRect) => {
  const topIntersection = Math.max(rectA.top, rectB.top);
  const bottomIntersection = Math.min(rectA.bottom, rectB.bottom);
  const intersectionHeight = Math.max(0, bottomIntersection - topIntersection);
  const minHeight = Math.min(rectA.height, rectB.height);
  return minHeight === 0 ? 0 : intersectionHeight / minHeight;
};

const SwitchBlockPlugin = ({ onNext, onPrevious }: SwitchBlockPluginProps) => {
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
          onNext();
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
          onPrevious();
          event?.preventDefault();
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onPrevious]);

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

        if (isLast) {
          onNext();
          event?.preventDefault();
          return true;
        }

        const rect = getDomSelectionRect();
        if (rect === undefined) {
          return false;
        }

        selectionPoint.current = ["down", Date.now(), selection.clone(), rect];

        return false;
      },
      COMMAND_PRIORITY_LOW
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

        if (isFirst) {
          onPrevious();
          event?.preventDefault();
          return true;
        }

        const rect = getDomSelectionRect();
        if (rect === undefined) {
          return false;
        }

        selectionPoint.current = ["up", Date.now(), selection.clone(), rect];

        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onPrevious]);

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

          if (type === "up") {
            onPrevious();
          } else {
            onNext();
          }
        }

        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, onNext, onPrevious]);

  return null;
};

const onError = (error: Error) => {
  throw error;
};

type TextEditorProps = {
  rootInstanceSelector: InstanceSelector;
  instances: Instances;
  contentEditable: JSX.Element;
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

  const handleNext = useCallback(() => {
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

    const nextIndex = mod(currentIndex + 1, results.length);

    $textEditingInstanceSelector.set(results[nextIndex]);
    $selectedInstanceSelector.set(results[nextIndex]);
  }, [instances, rootInstanceSelector]);

  const handlePrevious = useCallback(() => {
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

    const nextIndex = mod(currentIndex - 1, results.length);

    $textEditingInstanceSelector.set(results[nextIndex]);
    $selectedInstanceSelector.set(results[nextIndex]);
  }, [instances, rootInstanceSelector]);

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
      <SwitchBlockPlugin onNext={handleNext} onPrevious={handlePrevious} />
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
    </LexicalComposer>
  );
};
