import type { ChildrenUpdates, Instance } from "@webstudio-is/react-sdk";
import {
  RichTextPlugin,
  HistoryPlugin,
  LexicalComposer,
  useLexicalComposerContext,
} from "./lexical";
import { InstancePlugin } from "./plugins/plugin-instance";
import { ToolbarConnectorPlugin } from "./plugins/plugin-toolbar-connector";
import { OnChangePlugin } from "./plugins/plugin-on-change";
import { config } from "./config";
import { useEffect } from "react";

type EditorProps = {
  children?: JSX.Element;
  editable: JSX.Element;
  instance: Instance;
  onChange: (updates: ChildrenUpdates) => void;
};

const Editor = ({
  element,
  instance,
  editable,
  children,
  onChange,
}: EditorProps) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setRootElement(element);
  }, [element]);

  return (
    <>
      <RichTextPlugin contentEditable={editable} placeholder="" />
      <OnChangePlugin onChange={onChange} />
      <HistoryPlugin />
      <InstancePlugin>{instance.children}</InstancePlugin>
      <ToolbarConnectorPlugin />
      {children}
    </>
  );
};

const EditorConfigured = (props) => {
  return (
    <LexicalComposer initialConfig={config}>
      <Editor {...props} />
    </LexicalComposer>
  );
};

export default EditorConfigured;
