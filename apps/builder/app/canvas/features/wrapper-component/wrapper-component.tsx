import type { MouseEvent, FormEvent } from "react";
import { Suspense, lazy, useCallback, useMemo, useRef } from "react";
import { useStore } from "@nanostores/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import store from "immerhin";
import type { Instance, Prop } from "@webstudio-is/project-build";
import {
  renderWrapperComponentChildren,
  getComponent,
  idAttribute,
} from "@webstudio-is/react-sdk";
import {
  rootInstanceContainer,
  selectedInstanceIdStore,
  useInstanceProps,
  useInstanceStyles,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { createInstancesIndex } from "~/shared/tree-utils";
import { useCssRules } from "~/canvas/shared/styles";
import { SelectedInstanceConnector } from "./selected-instance-connector";

const TextEditor = lazy(() => import("../text-editor"));

const ContentEditable = ({
  Component,
  elementRef,
  ...props
}: {
  Component: NonNullable<ReturnType<typeof getComponent>>;
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

type UserProps = Record<Prop["name"], string | number | boolean>;

type WrapperComponentDevProps = {
  instance: Instance;
  children: Array<JSX.Element | string>;
};

export const WrapperComponentDev = ({
  instance,
  children,
}: WrapperComponentDevProps) => {
  const instanceId = instance.id;

  const instanceStyles = useInstanceStyles(instanceId);
  useCssRules({ instanceId: instance.id, instanceStyles });

  const [editingInstanceId, setTextEditingInstanceId] =
    useTextEditingInstanceId();
  const selectedInstanceId = useStore(selectedInstanceIdStore);

  const instanceProps = useInstanceProps(instance.id);
  const userProps = useMemo(() => {
    const result: UserProps = {};
    if (instanceProps === undefined) {
      return result;
    }
    for (const item of instanceProps) {
      if (item.type !== "asset") {
        result[item.name] = item.value;
      }
    }
    return result;
  }, [instanceProps]);

  const instanceElementRef = useRef<HTMLElement>();

  const readonlyProps =
    instance.component === "Input" ? { readOnly: true } : undefined;

  const Component = getComponent(instance.component);

  if (Component === undefined) {
    return <></>;
  }

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
      {selectedInstanceId === instance.id && (
        <SelectedInstanceConnector
          instanceElementRef={instanceElementRef}
          instance={instance}
          instanceStyles={instanceStyles}
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
          store.createTransaction([rootInstanceContainer], (rootInstance) => {
            const { instancesById } = createInstancesIndex(rootInstance);
            const instance = instancesById.get(instanceId);
            if (instance) {
              instance.children = updates;
            }
          });
        }}
        onSelectInstance={(instanceId) => {
          setTextEditingInstanceId(undefined);
          selectedInstanceIdStore.set(instanceId);
        }}
      />
    </Suspense>
  );
};
