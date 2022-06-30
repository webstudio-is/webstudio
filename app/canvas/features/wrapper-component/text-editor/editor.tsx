import { type ChildrenUpdates, type Instance } from "@webstudio-is/sdk";
import { RichTextPlugin, HistoryPlugin } from "./lexical";
import { InstancePlugin } from "./plugins/plugin-instance";
import { ToolbarConnectorPlugin } from "./plugins/plugin-toolbar-connector";
import { OnChangePlugin } from "./plugins/plugin-on-change";

type EditorProps = {
  children?: JSX.Element;
  editable: JSX.Element;
  instance: Instance;
  onChange: (updates: ChildrenUpdates) => void;
};

export const Editor = ({
  instance,
  editable,
  children,
  onChange,
}: EditorProps) => {
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
