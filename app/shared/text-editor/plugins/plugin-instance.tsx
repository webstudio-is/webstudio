import { useEffect, useMemo } from "react";
import {
  useSubscribe,
  useUserProps,
  type Instance,
  toCss,
} from "@webstudio-is/sdk";
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
import { useCss } from "~/canvas/features/wrapper-component/use-css";
import { useBreakpoints } from "~/shared/nano-states";

const INSERT_INSTANCE_COMMAND: LexicalCommand<CreateInstancePayload> =
  createCommand();

type CreateInstancePayload = {
  instance: Instance;
  props: Record<string, unknown>;
};

export const InstancePlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor.hasNodes([InstanceNode]) === false) {
      throw new Error("InstancePlugin: InstanceNode not registered on editor");
    }

    return editor.registerCommand<CreateInstancePayload>(
      INSERT_INSTANCE_COMMAND,
      ({ instance, props }) => {
        const selection = $getSelection();
        const text = selection?.getTextContent();
        if ($isRangeSelection(selection) && text) {
          const instanceNode = $createInstanceNode({
            component: (
              <InlineWrapperComponent {...props} instance={instance}>
                {text}
              </InlineWrapperComponent>
            ),
            text,
          });
          selection.insertNodes([instanceNode]);
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  useSubscribe<"insertInlineInstance", CreateInstancePayload>(
    "insertInlineInstance",
    (payload) => {
      editor.dispatchCommand<CreateInstancePayload>(
        INSERT_INSTANCE_COMMAND,
        payload
      );
    }
  );
  return null;
};

const InlineWrapperComponent = ({
  instance,
  ...rest
}: {
  instance: Instance;
  children: string;
}) => {
  const [breakpoints] = useBreakpoints();
  const css = useMemo(
    () => toCss(instance.cssRules, breakpoints),
    [instance, breakpoints]
  );
  const className = useCss({ instance, css });
  const userProps = useUserProps(instance.id);
  const { Component } = primitives[instance.component];

  return (
    <Component
      {...rest}
      {...userProps}
      key={instance.id}
      id={instance.id}
      className={className}
    />
  );
};
