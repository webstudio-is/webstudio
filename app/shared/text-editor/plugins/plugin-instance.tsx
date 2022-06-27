import { useEffect } from "react";
import { useSubscribe, type Instance } from "@webstudio-is/sdk";
import { primitives } from "../../canvas-components";
import { $createInstanceNode, InstanceNode } from "../nodes/node-instance";
import {
  createCommand,
  $isRangeSelection,
  $getSelection,
  COMMAND_PRIORITY_EDITOR,
  useLexicalComposerContext,
  type LexicalCommand,
} from "../lexical";

const INSERT_INSTANCE_COMMAND: LexicalCommand<Payload> = createCommand();

type Payload = {
  id: Instance["id"];
  component: keyof typeof primitives;
  props: Record<string, unknown>;
};

export const InstancePlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor.hasNodes([InstanceNode]) === false) {
      throw new Error("InstancePlugin: InstanceNode not registered on editor");
    }

    return editor.registerCommand<Payload>(
      INSERT_INSTANCE_COMMAND,
      (payload) => {
        const selection = $getSelection();
        const text = selection?.getTextContent();
        if ($isRangeSelection(selection) && text) {
          const { Component } = primitives[payload.component];
          const instanceNode = $createInstanceNode({
            component: <Component {...payload.props}>{text}</Component>,
            text,
            id: payload.id,
          });
          selection.insertNodes([instanceNode]);
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  useSubscribe<"insertInlineInstance", Payload>(
    "insertInlineInstance",
    (payload) => {
      editor.dispatchCommand<Payload>(INSERT_INSTANCE_COMMAND, payload);
    }
  );
  return null;
};
