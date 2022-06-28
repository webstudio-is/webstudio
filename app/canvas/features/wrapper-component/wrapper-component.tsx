import { useCallback, MouseEvent, FormEvent } from "react";
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
  onChangeChildren: _onChangeChildren,
  ...rest
}: WrapperComponentDevProps) => {
  const className = useCss({ instance, css });

  const { dragRefCallback, ...draggableProps } = useDraggable({
    instance,
    // We can't drag if we are editing text.
    isDisabled: false,
  });

  const focusRefCallback = useEnsureFocus();

  const refCallback = useCallback(
    (element) => {
      dragRefCallback(element);
      focusRefCallback(element);
    },
    [dragRefCallback, focusRefCallback]
  );

  const userProps = useUserProps(instance.id);
  const readonly =
    instance.component === "Input" ? { readOnly: true } : undefined;

  const { Component } = primitives[instance.component];
  return (
    <>
      <Component
        {...userProps}
        {...rest}
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
        {renderWrapperComponentChildren(children)}
      </Component>
    </>
  );
};
