import { MouseEvent, FormEvent } from "react";
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
import { useSelectedElement } from "~/canvas/shared/nano-states";
import { useCssRules } from "~/canvas/shared/styles";

const TextEditor = lazy(() => import("../text-editor"));

const ContentEditable = ({
  Component,
  elementRef,
  ...props
}: {
  // eslint-disable-next-line
  Component: any;
  elementRef: (element: null | HTMLElement) => void;
}) => {
  const [editor] = useLexicalComposerContext();

  const ref = useCallback(
    (rootElement: null | HTMLElement) => {
      editor.setRootElement(rootElement);
      elementRef(rootElement);
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
  ...rest
}: WrapperComponentDevProps) => {
  useCssRules(instance);

  const [editingInstanceId] = useTextEditingInstanceId();
  const [, setSelectedElement] = useSelectedElement();

  const refCallback = useCallback(
    (element) => {
      // When entering text editing we unmount the instance element, so we need to update the reference, otherwise we have a detached element referenced and bounding box will be wrong.
      if (element !== null) {
        setSelectedElement(element);
      }
    },
    [setSelectedElement]
  );

  const userProps = useUserProps(instance.id);
  const readonlyProps =
    instance.component === "Input" ? { readOnly: true } : undefined;

  const Component = getComponent(instance.component);

  const props = {
    ...userProps,
    ...rest,
    ...readonlyProps,
    tabIndex: 0,
    // @todo stop using id to free it up to the user
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
    <Component {...props}>{renderWrapperComponentChildren(children)}</Component>
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
      />
    </Suspense>
  );
};
