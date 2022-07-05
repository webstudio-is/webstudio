import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useEffect } from "react";

type RefCallback = (rootElement: null | HTMLElement) => void;

const props = {
  //autoCapitalize: false,
  //autoComplete: false,
  contentEditable: true,
};

export const useContentEditable = (
  isEditing: boolean
): [RefCallback, typeof props | undefined] => {
  const [editor] = useLexicalComposerContext();

  const ref: RefCallback = useCallback(
    (rootElement) => {
      editor.setRootElement(rootElement);
    },
    [editor]
  );

  useEffect(() => {
    if (isEditing === true) return;
    // Lets unset the root element when we are not editing
    editor.setRootElement(null);
  }, [editor, isEditing]);

  return [ref, isEditing ? props : undefined];
};
