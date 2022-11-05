import { useEffect } from "react";
import { type Instance } from "@webstudio-is/react-sdk";
import { useSubscribe } from "~/shared/pubsub";
import { $createInstanceNode, InstanceNode } from "../nodes/node-instance";
import {
  createCommand,
  $isRangeSelection,
  $getSelection,
  $getRoot,
  COMMAND_PRIORITY_EDITOR,
  useLexicalComposerContext,
  type LexicalCommand,
} from "../lexical";
import { toLexicalNodes } from "../utils/to-lexical-nodes";

const populateRoot = (children: Instance["children"]) => {
  const nodes = toLexicalNodes(children);
  const root = $getRoot();
  root.clear();
  for (const node of nodes) {
    root.append(node);
  }
  root.selectStart();
};

const INSERT_INSTANCE_COMMAND: LexicalCommand<Instance> = createCommand();

type InstancePluginProps = {
  children: Instance["children"];
};

export const InstancePlugin = ({ children }: InstancePluginProps) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor.hasNodes([InstanceNode]) === false) {
      throw new Error("InstancePlugin: InstanceNode not registered on editor");
    }

    return editor.registerCommand<Instance>(
      INSERT_INSTANCE_COMMAND,
      (instance) => {
        const selection = $getSelection();
        const text = selection?.getTextContent();
        if ($isRangeSelection(selection) && text) {
          const instanceNode = $createInstanceNode({
            instance,
            text,
            isNew: true,
          });
          selection.insertNodes([instanceNode]);
          // Dirty hack. When clicking on toolbar outside of the iframe, we are loosing focus.
          // For some reason we can only refocus after a delay
          requestAnimationFrame(() => {
            editor.update(() => {
              instanceNode.select();
            });
          });
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  useEffect(() => {
    editor.update(() => {
      populateRoot(children);
    });
  }, [editor, children]);

  useSubscribe("insertInlineInstance", (payload) => {
    editor.dispatchCommand<LexicalCommand<Instance>>(
      INSERT_INSTANCE_COMMAND,
      payload
    );
  });

  return null;
};
