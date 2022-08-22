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
import { useCallback, useEffect } from "react";
import { useSelectedElement } from "~/canvas/shared/nano-states";
import { getInstanceIdFromElement } from "~/shared/dom-utils";

export type EditorProps = {
  renderEditable: (ref?: (element: HTMLElement | null) => void) => JSX.Element;
  instance: Instance;
  onChange: (updates: ChildrenUpdates) => void;
};

const useSetElement = (instance: Instance) => {
  const [editor] = useLexicalComposerContext();
  return useCallback(
    (element) => {
      editor.setRootElement(element);
    },
    [editor]
  );
};

const Editor = ({ instance, renderEditable, onChange }: EditorProps) => {
  const refCallback = useSetElement(instance);
  const editable = renderEditable(refCallback);
  return (
    <>
      <RichTextPlugin contentEditable={editable} placeholder="" />
      <OnChangePlugin onChange={onChange} />
      <HistoryPlugin />
      <InstancePlugin>{instance.children}</InstancePlugin>
      <ToolbarConnectorPlugin />
    </>
  );
};

const EditorConfigured = (props: EditorProps) => {
  return (
    <LexicalComposer initialConfig={config}>
      <Editor {...props} />
    </LexicalComposer>
  );
};

export default EditorConfigured;
