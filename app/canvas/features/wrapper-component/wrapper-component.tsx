import { useCallback, MouseEvent, FormEvent, useMemo } from "react";
import type { OnChangeChildren } from "~/shared/tree-utils";
import {
  type Instance,
  type CSS,
  useUserProps,
  renderWrapperComponentChildren,
} from "@webstudio-is/sdk";
import { primitives } from "~/shared/canvas-components";
import { useCss } from "./use-css";
import { useDraggable } from "./use-draggable";
import { useEnsureFocus } from "./use-ensure-focus";
import { Editor } from "./editor/editor";
import { useIsEditing } from "./editor/use-is-editing";
import { useContentEditable } from "~/shared/text-editor";
import noop from "lodash.noop";

type WrapperComponentDevProps = {
  instance: Instance;
  css: CSS;
  children: Array<JSX.Element | string>;
  onChangeChildren?: OnChangeChildren;
};

export const WrapperComponentDev = ({
  instance,
  css,
  children,
  onChangeChildren = noop,
  ...rest
}: WrapperComponentDevProps) => {
  const className = useCss({ instance, css });
  const [isEditing, isEditingProps] = useIsEditing(instance);
  const [editableRefCallback, editableProps] = useContentEditable(isEditing);
  const { dragRefCallback, ...draggableProps } = useDraggable({
    instance,
    // We can't drag if we are editing text.
    isDisabled: isEditing === true,
  });

  const focusRefCallback = useEnsureFocus();

  const refCallback = useCallback(
    (element) => {
      if (isEditing) editableRefCallback(element);
      dragRefCallback(element);
      focusRefCallback(element);
    },
    [dragRefCallback, focusRefCallback, editableRefCallback, isEditing]
  );

  const userProps = useUserProps(instance.id);
  const readonlyProps =
    instance.component === "Input" ? { readOnly: true } : undefined;

  const { Component } = primitives[instance.component];

  const props = {
    ...userProps,
    ...rest,
    ...draggableProps,
    ...readonlyProps,
    ...isEditingProps,
    ...editableProps,
    className: className,
    id: instance.id,
    tabIndex: 0,
    "data-component": instance.component,
    "data-id": instance.id,
    ref: refCallback,
    onClick: (event: MouseEvent) => {
      // Prevent click handler for element selection
      if (isEditing) {
        event.stopPropagation();
      }
      if (instance.component === "Link") {
        event.preventDefault();
      }
    },
    onSubmit: (event: FormEvent) => {
      // Prevent submitting the form when clicking a button type submit
      event.preventDefault();
    },
  };

  // Prevent rerender because in editing mode Editor controls the node.
  const editor = useMemo(() => {
    if (isEditing === false) return;
    return (
      <Editor
        editable={<Component {...props} />}
        onChange={(updates) => {
          onChangeChildren({ instanceId: instance.id, updates });
        }}
      >
        {instance.children}
      </Editor>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  if (editor) {
    return editor;
  }

  return (
    <Component {...props}>{renderWrapperComponentChildren(children)}</Component>
  );
};
