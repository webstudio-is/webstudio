import { type Instance } from "@webstudio-is/sdk";
import {
  RichTextPlugin,
  HistoryPlugin,
  InstancePlugin,
} from "~/shared/text-editor";

type EditorProps = {
  editable: JSX.Element;
  children: Array<Instance | string>;
};

export const Editor = ({ children, editable }: EditorProps) => {
  return (
    <>
      <RichTextPlugin contentEditable={editable} placeholder="" />
      <HistoryPlugin />
      <InstancePlugin>{children}</InstancePlugin>
    </>
  );
};
