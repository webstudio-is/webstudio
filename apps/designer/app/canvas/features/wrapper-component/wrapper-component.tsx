import { useCallback, MouseEvent, FormEvent, useMemo } from "react";
import type { OnChangeChildren } from "~/shared/tree-utils";
import {
  type Instance,
  type CSS,
  toCss,
  useUserProps,
  renderWrapperComponentChildren,
} from "@webstudio-is/react-sdk";
import { primitives } from "~/shared/canvas-components";
import { useBreakpoints, useTextEditingInstanceId } from "~/shared/nano-states";
import { useCss } from "./use-css";
import { useDraggable } from "./use-draggable";
import { useEnsureFocus } from "./use-ensure-focus";
import { EditorMemoized, useContentEditable } from "./text-editor";
import noop from "lodash.noop";
import { useSelectedElement } from "~/canvas/shared/nano-states";

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
  const [editingInstanceId] = useTextEditingInstanceId();
  const [, setSelectedElement] = useSelectedElement();
  const isEditing = editingInstanceId === instance.id;
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
      // When entering text editing we unmount the instance element, so we need to update the reference, otherwise we have a detached element referenced and bounding box will be wrong.
      if (element !== null) setSelectedElement(element);
    },
    [
      dragRefCallback,
      focusRefCallback,
      editableRefCallback,
      setSelectedElement,
      isEditing,
    ]
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
    ...editableProps,
    // @todo merge className with props
    className: className,
    // @todo stop using id to free it up to the user
    id: instance.id,
    tabIndex: 0,
    "data-component": instance.component,
    "data-id": instance.id,
    ref: refCallback,
    onClick: (event: MouseEvent) => {
      if (instance.component === "Link") {
        event.preventDefault();
      }
    },
    onSubmit: (event: FormEvent) => {
      // Prevent submitting the form when clicking a button type submit
      event.preventDefault();
    },
  };

  if (isEditing) {
    return (
      <EditorMemoized
        instance={instance}
        editable={<Component {...props} />}
        onChange={(updates) => {
          onChangeChildren({ instanceId: instance.id, updates });
        }}
      />
    );
  }

  return (
    <Component {...props}>{renderWrapperComponentChildren(children)}</Component>
  );
};

// Only used for instances inside text editor.
export const InlineWrapperComponentDev = ({
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
      data-outline-disabled
      key={instance.id}
      // @todo stop using id to free it up to the user
      id={instance.id}
      // @todo merge className with props
      className={className}
    />
  );
};
