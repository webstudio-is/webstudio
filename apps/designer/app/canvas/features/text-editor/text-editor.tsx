import { useEffect, useState } from "react";
import type { LexicalEditor } from "lexical";
import { LinkNode } from "@lexical/link";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import type { ChildrenUpdates, Instance } from "@webstudio-is/react-sdk";
import { toCss, css } from "@webstudio-is/react-sdk";
import { useBreakpoints } from "~/shared/nano-states";
import { ToolbarConnectorPlugin } from "./toolbar-connector";
import { type Refs, $convertToLexical, $convertToUpdates } from "./interop";

const NodeConnector = ({
  editor,
  nodeKey,
  instance,
}: {
  editor: LexicalEditor;
  nodeKey: string;
  instance: Instance;
}) => {
  const [breakpoints] = useBreakpoints();
  useEffect(() => {
    // extract key from stored key:style format
    const [key] = nodeKey.split(":");
    const element = editor.getElementByKey(key);
    if (element) {
      const className = css(toCss(instance, breakpoints))().toString();
      // assume only styles are important while editing text
      element.className = className;
    }
  }, [editor, nodeKey, instance, breakpoints]);
  return null;
};

const NodesConnectorPlugin = ({ refs }: { refs: Refs }) => {
  const [editor] = useLexicalComposerContext();
  return (
    <>
      {Array.from(refs).map(([nodeKey, instance]) => (
        <NodeConnector
          key={nodeKey}
          editor={editor}
          nodeKey={nodeKey}
          instance={instance}
        />
      ))}
    </>
  );
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
  // store references separately because lexical nodes
  // cannot store custom data
  // Map<nodeKey, Instance>
  const [refs] = useState<Refs>(() => new Map());
  const initialConfig = {
    namespace: "WsTextEditor",
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
      <ToolbarConnectorPlugin />
      <NodesConnectorPlugin refs={refs} />
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
