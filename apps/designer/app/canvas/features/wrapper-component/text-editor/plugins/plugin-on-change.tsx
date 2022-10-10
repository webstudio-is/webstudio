import { type ChildrenUpdates } from "@webstudio-is/react-sdk";
import { useCallback, useEffect, useState } from "react";
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

  const handleChange = useCallback(() => {
    if (editorState === undefined) return;
    editorState.read(() => {
      const updates = toUpdates(editorState.toJSON().root);
      onChange(updates);
    });
  }, [editorState, onChange]);

  // When we quit editing mode, we need to safe again otherwise it can happen before debounce calls.
  useEffect(() => handleChange);

  useDebounce(handleChange, 1000, [handleChange]);

  return <LexicalOnChangePlugin onChange={setEditorState} />;
};
