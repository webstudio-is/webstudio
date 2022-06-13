import { useCallback, MouseEvent, FormEvent } from "react";
import type { OnChangeChildren } from "~/shared/tree-utils";
import {
  type Instance,
  type CSS,
  useUserProps,
  renderWrapperComponentChildren,
} from "@webstudio-is/sdk";
import { primitives } from "~/shared/component";
import { useContentEditable } from "./editable";
import { useCss } from "./use-css";
import { useDraggable } from "./use-draggable";
import { useEnsureFocus } from "./use-ensure-focus";

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
  onChangeChildren,
  ...rest
}: WrapperComponentDevProps) => {
  const className = useCss({ instance, css });

  const {
    ref: contentEditableRef,
    isDisabled: isContentEditableDisabled,
    toolbar: editableToolbar,
    ...contentEditableProps
  } = useContentEditable({
    instance,
    children,
    onChangeChildren,
  });

  const { dragRefCallback, ...draggableProps } = useDraggable({
    instance,
    isDisabled: isContentEditableDisabled === false,
  });

  const focusRefCallback = useEnsureFocus();

  const refCallback = useCallback(
    (element) => {
      contentEditableRef.current = element;
      // We can't drag if we are editing text.
      dragRefCallback(element);
      focusRefCallback(element);
    },
    [contentEditableRef, dragRefCallback, focusRefCallback]
  );

  const userProps = useUserProps(instance.id);
  const readonly =
    instance.component === "Input" ? { readOnly: true } : undefined;

  const { Component } = primitives[instance.component];
  return (
    <>
      {editableToolbar}
      <Component
        {...userProps}
        {...rest}
        {...contentEditableProps}
        {...draggableProps}
        {...readonly}
        className={className}
        id={instance.id}
        tabIndex={0}
        data-component={instance.component}
        data-id={instance.id}
        ref={refCallback}
        onClick={(event: MouseEvent) => {
          if (instance.component === "Link") {
            event.preventDefault();
          }
        }}
        onSubmit={(event: FormEvent) => {
          // Prevent submitting the form when clicking a button type submit
          event.preventDefault();
        }}
      >
        {renderWrapperComponentChildren(contentEditableProps.children)}
      </Component>
    </>
  );
};
