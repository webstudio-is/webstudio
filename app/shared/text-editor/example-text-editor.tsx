import { publish } from "@webstudio-is/sdk";
import {
  type EditorState,
  LexicalComposer,
  RichTextPlugin,
  ContentEditable,
  HistoryPlugin,
  OnChangePlugin,
} from "./lexical";
import { InstancePlugin } from "./plugins/plugin-instance";
import { TreeViewPlugin } from "./plugins/tree-view-plugin";
import { config } from "./config";

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
        const url = prompt("Enter url");
        console.log(url);
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
