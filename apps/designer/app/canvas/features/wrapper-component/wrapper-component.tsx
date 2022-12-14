import type { MouseEvent, FormEvent } from "react";
import { useRef } from "react";
import { Suspense, lazy, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  useUserProps,
  renderWrapperComponentChildren,
  getComponent,
  type Instance,
  type OnChangeChildren,
  idAttribute,
} from "@webstudio-is/react-sdk";
import { useTextEditingInstanceId } from "~/shared/nano-states";
import {
  useSelectedElement,
  useSelectedInstance,
} from "~/canvas/shared/nano-states";
import { useCssRules } from "~/canvas/shared/styles";
import { publish } from "~/shared/pubsub";
import { SelectedInstanceConnector } from "./selected-instance-connector";

const TextEditor = lazy(() => import("../text-editor"));

const ContentEditable = ({
  Component,
  elementRef,
  ...props
}: {
  Component: ReturnType<typeof getComponent>;
  elementRef: (element: undefined | HTMLElement) => void;
}) => {
  const [editor] = useLexicalComposerContext();

  const ref = useCallback(
    (rootElement: null | HTMLElement) => {
      editor.setRootElement(rootElement);
      elementRef(rootElement ?? undefined);
    },
    [editor, elementRef]
  );

  return <Component ref={ref} {...props} contentEditable={true} />;
};

type WrapperComponentDevProps = {
  instance: Instance;
  children: Array<JSX.Element | string>;
  onChangeChildren?: OnChangeChildren;
};

export const WrapperComponentDev = ({
  instance,
  children,
  onChangeChildren,
}: WrapperComponentDevProps) => {
  useCssRules(instance);

  const [editingInstanceId, setTextEditingInstanceId] =
    useTextEditingInstanceId();
  const [selectedInstance] = useSelectedInstance();
  const [, setSelectedElement] = useSelectedElement();

  const instanceElementRef = useRef<HTMLElement>();

  const refCallback = useCallback(
    (element: undefined | HTMLElement) => {
      // When entering text editing we unmount the instance element, so we need to update the reference, otherwise we have a detached element referenced and bounding box will be wrong.
      if (element !== undefined) {
        setSelectedElement(element);
      }
      instanceElementRef.current = element;
    },
    [setSelectedElement]
  );

  const userProps = useUserProps(instance.id);
  const readonlyProps =
    instance.component === "Input" ? { readOnly: true } : undefined;

  const Component = getComponent(instance.component);

  const props = {
    ...userProps,
    ...readonlyProps,
    tabIndex: 0,
    // we should replace id, data-component and data-id with "data-ws"=instance.id and grab the rest always over the id
    // for this we need to also make search by id fast
    id: instance.id,
    "data-ws-component": instance.component,
    [idAttribute]: instance.id,
    onClick: (event: MouseEvent) => {
      if (
        instance.component === "Link" ||
        instance.component === "RichTextLink"
      ) {
        event.preventDefault();
      }
    },
    onSubmit: (event: FormEvent) => {
      // Prevent submitting the form when clicking a button type submit
      event.preventDefault();
    },
  };

  const instanceElement = (
    <>
      {selectedInstance?.id === instance.id && (
        <SelectedInstanceConnector
          instanceElementRef={instanceElementRef}
          instance={instance}
          instanceProps={userProps}
        />
      )}
      {/* Component includes many types and it's hard to provide right ref type with useRef */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Component {...props} ref={instanceElementRef as any}>
        {renderWrapperComponentChildren(children)}
      </Component>
    </>
  );

  if (editingInstanceId !== instance.id) {
    return instanceElement;
  }

  return (
    <Suspense fallback={instanceElement}>
      <TextEditor
        instance={instance}
        contentEditable={
          <ContentEditable
            {...props}
            elementRef={refCallback}
            Component={Component}
          />
        }
        onChange={(updates) => {
          onChangeChildren?.({ instanceId: instance.id, updates });
        }}
        onSelectInstance={(instanceId) => {
          setTextEditingInstanceId(undefined);
          publish({
            type: "selectInstanceById",
            payload: instanceId,
          });
        }}
      />
    </Suspense>
  );
};
