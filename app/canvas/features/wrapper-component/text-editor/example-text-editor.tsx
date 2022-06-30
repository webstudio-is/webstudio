import {
  type ChildrenUpdates,
  publish,
  useAllUserProps,
} from "@webstudio-is/sdk";
import {
  LexicalComposer,
  RichTextPlugin,
  ContentEditable,
  HistoryPlugin,
} from "./lexical";
import { OnChangePlugin } from "./plugins/plugin-on-change";
import { InstancePlugin } from "./plugins/plugin-instance";
import { TreeViewPlugin } from "./plugins/tree-view-plugin";
import { config } from "./config";
import { createInstance } from "../../../../shared/tree-utils";

type ExampleTextEditorProps = {
  onChange: (state: ChildrenUpdates) => void;
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
            payload: instance,
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
            payload: instance,
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
            payload: instance,
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
          <InstancePlugin>
            {[
              "Pragraph you can edit ",
              {
                component: "Bold",
                id: "62bd56ad8f5562223cb85cc2",
                cssRules: [],
                children: ["bold"],
              },
            ]}
          </InstancePlugin>
          <TreeViewPlugin />
        </div>
      </LexicalComposer>
    </>
  );
};
