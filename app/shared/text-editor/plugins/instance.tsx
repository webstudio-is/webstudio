import { $createInstanceNode, InstanceNode } from "../nodes/instance";
import { useEffect } from "react";
import {
  TextNode,
  createCommand,
  $isRangeSelection,
  $getSelection,
  COMMAND_PRIORITY_EDITOR,
  type LexicalCommand,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useSubscribe } from "@webstudio-is/sdk";

export const INSERT_INSTANCE_COMMAND: LexicalCommand<void> = createCommand();

export const InstancePlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor.hasNodes([InstanceNode]) === false) {
      throw new Error("InstancePlugin: InstanceNode not registered on editor");
    }

    return editor.registerCommand(
      INSERT_INSTANCE_COMMAND,
      (type) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const instanceNode = $createInstanceNode({
            type,
            text: selection.getTextContent(),
          });
          selection.insertNodes([instanceNode]);
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  useSubscribe("insertInlineInstance", (type) => {
    editor.dispatchCommand(INSERT_INSTANCE_COMMAND, type);
  });

  return null;
};
