import {
  RichTextPlugin,
  HistoryPlugin,
  InstancePlugin,
} from "~/shared/text-editor";

type EditorProps = {
  children: JSX.Element;
};

export const Editor = ({ children }: EditorProps) => {
  return (
    <>
      <RichTextPlugin contentEditable={children} placeholder="" />
      <HistoryPlugin />
      <InstancePlugin />
    </>
  );
};
