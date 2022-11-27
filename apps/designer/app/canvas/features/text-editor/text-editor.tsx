import { useState, useEffect, useLayoutEffect } from "react";
import {
  KEY_ENTER_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  RootNode,
  ElementNode,
  $createLineBreakNode,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import { LinkNode } from "@lexical/link";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { nanoid } from "nanoid";
import { createCssEngine } from "@webstudio-is/css-engine";
import type { ChildrenUpdates, Instance } from "@webstudio-is/react-sdk";
import { idAttribute } from "@webstudio-is/react-sdk";
import { ToolbarConnectorPlugin } from "./toolbar-connector";
import { type Refs, $convertToLexical, $convertToUpdates } from "./interop";

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
    editor.focus();
  }, [editor]);

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

const onError = (error: Error) => {
  throw error;
};

type TextEditorProps = {
  instance: Instance;
  contentEditable: JSX.Element;
  onChange: (updates: ChildrenUpdates) => void;
};

export const TextEditor = ({
  instance,
  contentEditable,
  onChange,
}: TextEditorProps) => {
  const [paragraphClassName] = useState(() => nanoid());
  const [italicClassName] = useState(() => nanoid());

  useLayoutEffect(() => {
    const engine = createCssEngine();
    // reset paragraph styles and make it work inside <a>
    engine.addPlaintextRule(`
      .${paragraphClassName} { display: inline; margin: 0; }
    `);
    /// set italic style for bold italic combination on the same element
    engine.addPlaintextRule(`
      .${italicClassName} { font-style: italic; }
    `);
    engine.render();
    return () => {
      engine.unmount();
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
      // text editor is unmounted when change properties in side panel
      // so assume new nodes don't need to preserve instance id
      // and store only initial references
      $convertToLexical(instance, refs);
    },
    nodes: [LinkNode],
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <AutofocusPlugin />
      <RemoveParagaphsPlugin />
      <ToolbarConnectorPlugin />
      <BindInstanceToNodePlugin refs={refs} />
      <RichTextPlugin
        ErrorBoundary={LexicalErrorBoundary}
        contentEditable={contentEditable}
        placeholder=""
      />
      <LinkPlugin />
      <HistoryPlugin />
      <OnChangePlugin
        ignoreSelectionChange={true}
        onChange={(editorState) => {
          editorState.read(() => {
            onChange($convertToUpdates(refs));
          });
        }}
      />
    </LexicalComposer>
  );
};
