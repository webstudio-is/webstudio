import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { InstancePlugin } from "./plugins/plugin-instance";
import { TreeViewPlugin } from "./plugins/tree-view-plugin";
import { config } from "./config";
import { publish } from "@webstudio-is/sdk";
import { type EditorState } from "lexical";

type ExampleTextEditorProps = {
  onChange: (state: EditorState) => void;
};

const Menu = () => (
  <div className="editor-menu">
    <button
      onClick={() => {
        publish({
          type: "insertInlineInstance",
          payload: {
            component: "Bold",
            props: {},
          },
        });
      }}
    >
      Bold
    </button>
    <button
      onClick={() => {
        publish({
          type: "insertInlineInstance",
          payload: {
            component: "Italic",
            props: {},
          },
        });
      }}
    >
      Italic
    </button>
    <button
      onClick={() => {
        publish({
          type: "insertInlineInstance",
          payload: {
            component: "Link",
            props: { href: "https://google.com", target: "_blank" },
          },
        });
      }}
    >
      Link
    </button>
  </div>
);

export const ExampleTextEditor = ({ onChange }: ExampleTextEditorProps) => {
  return (
    <>
      <Menu />
      <LexicalComposer initialConfig={config}>
        <div className="editor-container">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input" />}
            placeholder={<Placeholder />}
          />
          <OnChangePlugin onChange={onChange} />
          <HistoryPlugin />
          <InstancePlugin />
          <TreeViewPlugin />
        </div>
      </LexicalComposer>
    </>
  );
};

const Placeholder = () => {
  return <div className="editor-placeholder">Enter some plain text...</div>;
};
