import { type MouseEvent, type FormEvent, useMemo } from "react";
import { useRef } from "react";
import { Suspense, lazy, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  type Instance,
  type OnChangeChildren,
  type UserProp,
  renderWrapperComponentChildren,
  getComponent,
  idAttribute,
  useAllUserProps,
} from "@webstudio-is/react-sdk";
import { useTextEditingInstanceId } from "~/shared/nano-states";
import { useSelectedInstance } from "~/canvas/shared/nano-states";
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
  elementRef: { current: undefined | HTMLElement };
}) => {
  const [editor] = useLexicalComposerContext();

  const ref = useCallback(
    (rootElement: null | HTMLElement) => {
      editor.setRootElement(rootElement);
      elementRef.current = rootElement ?? undefined;
    },
    [editor, elementRef]
  );

  return <Component ref={ref} {...props} contentEditable={true} />;
};

type UserProps = Record<UserProp["prop"], string | number | boolean>;

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
  const instanceStylesKey = useCssRules({ instanceId: instance.id });

  const [editingInstanceId, setTextEditingInstanceId] =
    useTextEditingInstanceId();
  const [selectedInstance] = useSelectedInstance();

  const allUserProps = useAllUserProps();
  const instanceProps = allUserProps[instance.id];
  const userProps = useMemo(() => {
    const result: UserProps = {};
    if (instanceProps === undefined) {
      return result;
    }
    for (const item of instanceProps.props) {
      if (item.type !== "asset") {
        result[item.prop] = item.value;
      }
    }
    return result;
  }, [instanceProps]);

  const instanceElementRef = useRef<HTMLElement>();

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
          instanceStylesKey={instanceStylesKey}
          instanceProps={instanceProps}
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
            elementRef={instanceElementRef}
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
