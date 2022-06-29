import { type ChildrenUpdates } from "@webstudio-is/sdk";
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
  const handleChange = (state: EditorState) => {
    state.read(() => {
      const updates = toUpdates(state.toJSON().root);
      onChange(updates);
      console.log(state.toJSON());
      console.log(updates);
    });
  };

  return <LexicalOnChangePlugin onChange={handleChange} />;
};
