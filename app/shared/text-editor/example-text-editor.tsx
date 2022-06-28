import { publish, useAllUserProps } from "@webstudio-is/sdk";
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
import { createInstance } from "../tree-utils";

type ExampleTextEditorProps = {
  onChange: (state: EditorState) => void;
};

const Menu = () => {
  const [, setAllUserProps] = useAllUserProps();
  return (
    <div className="editor-menu">
      <button
        onClick={() => {
          const instance = createInstance({ component: "Bold" });
          publish({
            type: "insertInlineInstance",
            payload: {
              instance,
              props: {},
            },
          });
        }}
      >
        Bold
      </button>
      <button
        onClick={() => {
          const instance = createInstance({ component: "Italic" });
          publish({
            type: "insertInlineInstance",
            payload: {
              instance,
              props: {},
            },
          });
        }}
      >
        Italic
      </button>
      <button
        onClick={() => {
          const instance = createInstance({ component: "Link" });
          publish({
            type: "insertInlineInstance",
            payload: {
              instance,
              props: { href: "", target: "_blank" },
            },
          });
          const url = prompt("Enter url");
          if (url === null) return;
          setAllUserProps({
            [instance.id]: {
              id: "1",
              instanceId: instance.id,
              treeId: "3",
              props: [
                {
                  id: "4",
                  prop: "href",
                  value: url,
                },
              ],
            },
          });
        }}
      >
        Link
      </button>
    </div>
  );
};
export const ExampleTextEditor = ({ onChange }: ExampleTextEditorProps) => {
  return (
    <>
      <Menu />
      <LexicalComposer initialConfig={config}>
        <div className="editor-container">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input" />}
            placeholder=""
          />
          <OnChangePlugin onChange={onChange} />
          <HistoryPlugin />
          <InstancePlugin children={["Something"]} />
          <TreeViewPlugin />
        </div>
      </LexicalComposer>
    </>
  );
};
