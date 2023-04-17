import { type MouseEvent, type FormEvent, useEffect } from "react";
import { Suspense, lazy, useCallback, useMemo, useRef } from "react";
import { useStore } from "@nanostores/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import store from "immerhin";
import {
  type Instance,
  type Prop,
  findTreeInstanceIds,
  Instances,
} from "@webstudio-is/project-build";
import {
  renderWebstudioComponentChildren,
  idAttribute,
  componentAttribute,
} from "@webstudio-is/react-sdk";
import type { GetComponent } from "@webstudio-is/react-sdk";
import {
  instancesStore,
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
  useInstanceProps,
  useInstanceStyles,
} from "~/shared/nano-states";
import { textEditingInstanceSelectorStore } from "~/shared/nano-states";
import { useCssRules } from "~/canvas/shared/styles";
import {
  type InstanceSelector,
  areInstanceSelectorsEqual,
} from "~/shared/tree-utils";
import { SelectedInstanceConnector } from "./selected-instance-connector";
import { handleLinkClick } from "./link";

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

type UserProps = Record<Prop["name"], Prop["value"]>;

// this utility is temporary solution to compute instance selectors
// for rich text subtree which cannot have slots so its safe to traverse ancestors
// until editor instance is reached
//
// once all lexical formats are replaced with elmenents it should be
// straightforward to compute selectors from lexical tree
const getInstanceSelector = (
  instances: Instances,
  rootInstanceSelector: InstanceSelector,
  instanceId: Instance["id"]
) => {
  const parentInstancesById = new Map<Instance["id"], Instance["id"]>();
  for (const instance of instances.values()) {
    for (const child of instance.children) {
      if (child.type === "id") {
        parentInstancesById.set(child.value, instance.id);
      }
    }
  }
  const selector: InstanceSelector = [];
  let currentInstanceId: undefined | Instance["id"] = instanceId;
  while (currentInstanceId) {
    selector.push(currentInstanceId);
    currentInstanceId = parentInstancesById.get(currentInstanceId);
    if (currentInstanceId === rootInstanceSelector[0]) {
      return [...selector, ...rootInstanceSelector];
    }
  }
  return undefined;
};

type WebstudioComponentDevProps = {
  instance: Instance;
  instanceSelector: InstanceSelector;
  children: Array<JSX.Element | string>;
  getComponent: GetComponent;
};

export const WebstudioComponentDev = ({
  instance,
  instanceSelector,
  children,
  getComponent,
}: WebstudioComponentDevProps) => {
  const instanceId = instance.id;
  const instanceElementRef = useRef<HTMLElement>();
  const instanceStyles = useInstanceStyles(instanceId);
  useCssRules({ instanceId: instance.id, instanceStyles });
  const instances = useStore(instancesStore);

  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const textEditingInstanceSelector = useStore(
    textEditingInstanceSelectorStore
  );

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

  const isSelected = areInstanceSelectorsEqual(
    selectedInstanceSelector,
    instanceSelector
  );

  // Scroll the selected instance into view when selected from navigator.
  useEffect(() => {
    if (isSelected) {
      instanceElementRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isSelected]);

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
    [componentAttribute]: instance.component,
    [idAttribute]: instance.id,
    onClick: (event: MouseEvent) => {
      if (event.currentTarget instanceof HTMLAnchorElement) {
        handleLinkClick(event);
      }
    },
    onSubmit: (event: FormEvent) => {
      // Prevent submitting the form when clicking a button type submit
      event.preventDefault();
    },
  };

  const instanceElement = (
    <>
      {isSelected && (
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
        {renderWebstudioComponentChildren(children)}
      </Component>
    </>
  );

  if (
    areInstanceSelectorsEqual(textEditingInstanceSelector, instanceSelector) ===
    false
  ) {
    return instanceElement;
  }

  return (
    <Suspense fallback={instanceElement}>
      <TextEditor
        rootInstanceSelector={instanceSelector}
        instances={instances}
        contentEditable={
          <ContentEditable
            {...props}
            elementRef={instanceElementRef}
            Component={Component}
          />
        }
        onChange={(instancesList) => {
          store.createTransaction([instancesStore], (instances) => {
            const deletedTreeIds = findTreeInstanceIds(instances, instance.id);
            for (const updatedInstance of instancesList) {
              instances.set(updatedInstance.id, updatedInstance);
              // exclude reused instances
              deletedTreeIds.delete(updatedInstance.id);
            }
            for (const instanceId of deletedTreeIds) {
              instances.delete(instanceId);
            }
          });
        }}
        onSelectInstance={(instanceId) => {
          const instances = instancesStore.get();
          const newSelectedSelector = getInstanceSelector(
            instances,
            instanceSelector,
            instanceId
          );
          textEditingInstanceSelectorStore.set(undefined);
          selectedInstanceSelectorStore.set(newSelectedSelector);
          selectedStyleSourceSelectorStore.set(undefined);
        }}
      />
    </Suspense>
  );
};
