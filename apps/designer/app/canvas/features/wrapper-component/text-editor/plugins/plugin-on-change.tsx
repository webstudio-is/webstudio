import { type ChildrenUpdates } from "@webstudio-is/react-sdk";
import { useState } from "react";
import { useDebounce } from "react-use";
import {
  OnChangePlugin as LexicalOnChangePlugin,
  type EditorState,
} from "../lexical";
import { toUpdates } from "../utils/to-updates";

export const OnChangePlugin = ({
  onChange,
}: {
  onChange: (updates: ChildrenUpdates) => void;
}) => {
  const [editorState, setEditorState] = useState<EditorState>();

  useDebounce(
    () => {
      if (editorState === undefined) return;
      editorState.read(() => {
        const updates = toUpdates(editorState.toJSON().root);
        onChange(updates);
      });
    },
    500,
    [editorState]
  );

  return <LexicalOnChangePlugin onChange={setEditorState} />;
};
