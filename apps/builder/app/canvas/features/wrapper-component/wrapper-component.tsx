import type { MouseEvent, FormEvent } from "react";
import { Suspense, lazy, useCallback, useMemo, useRef } from "react";
import { useStore } from "@nanostores/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import store from "immerhin";
import type { Instance, Prop } from "@webstudio-is/project-build";
import {
  renderWrapperComponentChildren,
  idAttribute,
  collapsedAttribute,
} from "@webstudio-is/react-sdk";
import type { GetComponent } from "@webstudio-is/react-sdk";
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
import { useIsomorphicLayoutEffect } from "react-use";

const TextEditor = lazy(() => import("../text-editor"));

const ContentEditable = ({
  Component,
  elementRef,
  ...props
}: {
  Component: NonNullable<ReturnType<GetComponent>>;
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

const setDataCollapsed = (element?: HTMLElement) => {
  if (element === undefined) {
    return;
  }
  // When we remove this attribute, artifical helper spacers will be removed,
  // then we synchronously calculate height/width to see if element would collapse
  // then we add spacers back on the side that requires them right away.
  // The idea is to not trigger a reflow while we are calculating offsets before we know
  // if the elmenent needs spacers, because this is going to happen every time elemnt updates and
  // we don't want to trigger a reflow every time.
  element.removeAttribute(collapsedAttribute);
  const collapsedWidth = element.offsetWidth === 0 ? "w" : "";
  const collapsedHeight = element.offsetHeight === 0 ? "h" : "";
  if (collapsedHeight || collapsedWidth) {
    element.setAttribute(collapsedAttribute, collapsedWidth + collapsedHeight);
  }
};

type UserProps = Record<Prop["name"], string | number | boolean>;

type WrapperComponentDevProps = {
  instance: Instance;
  children: Array<JSX.Element | string>;
  getComponent: GetComponent;
};

export const WrapperComponentDev = ({
  instance,
  children,
  getComponent,
}: WrapperComponentDevProps) => {
  const instanceId = instance.id;
  const instanceElementRef = useRef<HTMLElement>();
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

  useIsomorphicLayoutEffect(() => {
    setDataCollapsed(instanceElementRef.current);
  });

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
