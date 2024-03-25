import {
  useEffect,
  forwardRef,
  type ForwardedRef,
  useRef,
  useLayoutEffect,
  useMemo,
  Fragment,
  type ReactNode,
} from "react";
import { Suspense, lazy } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRefs } from "@react-aria/utils";
import type { Instance, Instances, Prop } from "@webstudio-is/sdk";
import { findTreeInstanceIds } from "@webstudio-is/sdk";
import {
  type WebstudioComponentProps,
  idAttribute,
  componentAttribute,
  showAttribute,
  selectorIdAttribute,
  indexAttribute,
  getIndexesWithinAncestors,
  createInstanceChildrenElements,
  collectionComponent,
  type AnyComponent,
  textContentAttribute,
} from "@webstudio-is/react-sdk";
import {
  $propValuesByInstanceSelector,
  getIndexedInstanceId,
  $instances,
  $registeredComponentMetas,
  $selectedInstanceRenderState,
  $selectedInstanceSelector,
  $selectedPage,
  useInstanceStyles,
} from "~/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { useCssRules } from "~/canvas/shared/styles";
import {
  type InstanceSelector,
  areInstanceSelectorsEqual,
} from "~/shared/tree-utils";
import { setDataCollapsed } from "~/canvas/collapsed";
import { getIsVisuallyHidden } from "~/shared/visually-hidden";
import { serverSyncStore } from "~/shared/sync";

const TextEditor = lazy(() => import("../text-editor"));

const ContentEditable = ({
  renderComponentWithRef,
}: {
  renderComponentWithRef: (
    elementRef: ForwardedRef<HTMLElement>
  ) => JSX.Element;
}) => {
  const [editor] = useLexicalComposerContext();

  const ref = useRef<HTMLElement>(null);

  /**
   * useLayoutEffect to be sure that editor plugins on useEffect would have access to rootElement
   */
  useLayoutEffect(() => {
    let rootElement = ref.current;

    if (rootElement == null) {
      return;
    }

    if (getIsVisuallyHidden(rootElement)) {
      return;
    }

    if (rootElement?.tagName === "BUTTON" || rootElement.tagName === "A") {
      // <button> with contentEditable does not let to press space
      // <a> stops working with inline-flex when only 1 character left
      // so add span inside and use it as editor element in lexical
      const span = document.createElement("span");
      for (const child of rootElement.childNodes) {
        rootElement.removeChild(child);
        span.appendChild(child);
      }
      rootElement.appendChild(span);

      rootElement = span;
    }
    if (rootElement) {
      rootElement.contentEditable = "true";
    }

    editor.setRootElement(rootElement);
  }, [editor]);

  return renderComponentWithRef(ref);
};

const StubComponent = forwardRef<HTMLDivElement, { children?: ReactNode }>(
  (props, ref) => {
    return (
      <div
        {...props}
        ref={ref}
        style={{ display: props.children ? "contents" : "block" }}
      />
    );
  }
);

StubComponent.displayName = "StubComponent";

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

const $indexesWithinAncestors = computed(
  [$registeredComponentMetas, $instances, $selectedPage],
  (metas, instances, page) => {
    return getIndexesWithinAncestors(
      metas,
      instances,
      page ? [page.rootInstanceId] : []
    );
  }
);

const useInstanceProps = (instanceSelector: InstanceSelector) => {
  const instanceSelectorKey = JSON.stringify(instanceSelector);
  const [instanceId] = instanceSelector;
  const $instancePropsObject = useMemo(() => {
    return computed(
      [$propValuesByInstanceSelector, $indexesWithinAncestors],
      (propValuesByInstanceSelector, indexesWithinAncestors) => {
        const instancePropsObject: Record<Prop["name"], unknown> = {};
        const index = indexesWithinAncestors.get(instanceId);
        if (index !== undefined) {
          instancePropsObject[indexAttribute] = index.toString();
        }
        const instanceProps =
          propValuesByInstanceSelector.get(instanceSelectorKey);
        if (instanceProps) {
          for (const [name, value] of instanceProps) {
            instancePropsObject[name] = value;
          }
        }
        return instancePropsObject;
      }
    );
  }, [instanceSelectorKey, instanceId]);
  const instancePropsObject = useStore($instancePropsObject);
  return instancePropsObject;
};

const existingElements = new Set<string>();

/**
 * We are identifying newly created instances like Tooltips and ensuring the calculation of 'collapsed' elements.
 */
const useCollapsedOnNewElement = (instanceId: Instance["id"]) => {
  useEffect(() => {
    if (existingElements.has(instanceId) === false) {
      setDataCollapsed(instanceId);
    }

    existingElements.add(instanceId);
    return () => {
      existingElements.delete(instanceId);
    };
  }, [instanceId]);
};

/**
 * We combine Radix's implicit event handlers with user-defined ones,
 * such as onClick or onSubmit. For instance, a Button within
 * a TooltipTrigger receives an onClick handler from the TooltipTrigger.
 * We might also need an additional onClick handler on the Button for other
 * purposes (setting variable).
 **/
const mergeProps = (
  // here we assume all on* props are callbacks
  // cast to avoid extra checks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  restProps: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instanceProps: Record<string, any>,
  callbackStrategy: "merge" | "delete"
) => {
  // merge props into single object
  const props = { ...restProps, ...instanceProps };
  for (const propName of Object.keys(props)) {
    const restPropValue = restProps[propName];
    const instancePropValue = instanceProps[propName];

    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler === false) {
      continue;
    }
    // combine handlers for preview
    if (callbackStrategy === "merge") {
      props[propName] = (...args: unknown[]) => {
        restPropValue?.(...args);
        instancePropValue?.(...args);
      };
    }
    // delete all handlers from canvas mode
    if (callbackStrategy === "delete") {
      delete props[propName];
    }
  }
  return props;
};

const getTextContent = (instanceProps: Record<string, unknown>) => {
  const value = instanceProps[textContentAttribute];
  // serialize objects and let react render literal types
  if (typeof value === "object" && value !== null) {
    return String(value);
  }
  return value as ReactNode;
};

// eslint-disable-next-line react/display-name
export const WebstudioComponentCanvas = forwardRef<
  HTMLElement,
  WebstudioComponentProps
>(({ instance, instanceSelector, components, ...restProps }, ref) => {
  const rootRef = useRef<null | HTMLDivElement>(null);
  const instanceId = instance.id;
  const instanceStyles = useInstanceStyles(instanceId);
  useCssRules({ instanceId: instance.id, instanceStyles });
  const instances = useStore($instances);

  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);

  const { [showAttribute]: show = true, ...instanceProps } =
    useInstanceProps(instanceSelector);

  const children =
    getTextContent(instanceProps) ??
    createInstanceChildrenElements({
      instances,
      instanceSelector,
      children: instance.children,
      Component: WebstudioComponentCanvas,
      components,
    });
  /**
   * Prevents edited element from having a size of 0 on the first render.
   * Directly using `children` in Text Edit
   * conflicts with React due to lexical node changes.
   */
  const initialContentEditableContent = useRef(children);

  useCollapsedOnNewElement(instanceId);

  // this assumes presence of `useStore($selectedInstanceSelector)` above
  // we rely on root re-rendering after selected instance changes
  useEffect(() => {
    // 1 means root
    if (instanceSelector.length === 1) {
      // If by the time root is rendered,
      // no selected instance renders and sets state to "mounted",
      // then it's clear that selected instance will not render at all, so we set it to "notMounted"
      if ($selectedInstanceRenderState.get() === "pending") {
        $selectedInstanceRenderState.set("notMounted");
      }
    }
  });

  if (show === false) {
    return <></>;
  }

  if (instance.component === collectionComponent) {
    const data = instanceProps.data;
    // render stub component when no data or children
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      instance.children.length > 0
    ) {
      return data.map((_item, index) => {
        return (
          <Fragment key={index}>
            {createInstanceChildrenElements({
              instances,
              // create fake indexed id to distinct items for select and hover
              instanceSelector: [
                getIndexedInstanceId(instance.id, index),
                ...instanceSelector,
              ],
              children: instance.children,
              Component: WebstudioComponentCanvas,
              components,
            })}
          </Fragment>
        );
      });
    }
  }

  const Component =
    components.get(instance.component) ?? (StubComponent as AnyComponent);

  const props: {
    [componentAttribute]: string;
    [idAttribute]: string;
  } & Record<string, unknown> = {
    ...mergeProps(restProps, instanceProps, "delete"),
    // current props should override bypassed from parent
    // important for data-ws-* props
    tabIndex: 0,
    [selectorIdAttribute]: instanceSelector.join(","),
    [componentAttribute]: instance.component,
    [idAttribute]: instance.id,
  };

  const instanceElement = (
    <>
      <Component {...props} ref={mergeRefs(ref, rootRef)}>
        {children}
      </Component>
    </>
  );

  if (
    areInstanceSelectorsEqual(textEditingInstanceSelector, instanceSelector) ===
    false
  ) {
    initialContentEditableContent.current = children;
    return instanceElement;
  }

  return (
    <Suspense fallback={instanceElement}>
      <TextEditor
        rootRef={rootRef}
        rootInstanceSelector={instanceSelector}
        instances={instances}
        onBlur={() => {
          $textEditingInstanceSelector.set(undefined);
        }}
        contentEditable={
          <ContentEditable
            renderComponentWithRef={(elementRef) => (
              <Component {...props} ref={mergeRefs(ref, elementRef, rootRef)}>
                {initialContentEditableContent.current}
              </Component>
            )}
          />
        }
        onChange={(instancesList) => {
          serverSyncStore.createTransaction([$instances], (instances) => {
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
          const instances = $instances.get();
          const newSelectedSelector = getInstanceSelector(
            instances,
            instanceSelector,
            instanceId
          );
          $textEditingInstanceSelector.set(undefined);
          $selectedInstanceSelector.set(newSelectedSelector);
        }}
      />
    </Suspense>
  );
});

// eslint-disable-next-line react/display-name
export const WebstudioComponentPreview = forwardRef<
  HTMLElement,
  WebstudioComponentProps
>(({ instance, instanceSelector, components, ...restProps }, ref) => {
  const instances = useStore($instances);
  const instanceStyles = useInstanceStyles(instance.id);
  useCssRules({ instanceId: instance.id, instanceStyles });
  const { [showAttribute]: show = true, ...instanceProps } =
    useInstanceProps(instanceSelector);
  const props = {
    ...mergeProps(restProps, instanceProps, "merge"),
    [idAttribute]: instance.id,
    [componentAttribute]: instance.component,
  };
  if (show === false) {
    return <></>;
  }

  if (instance.component === collectionComponent) {
    const data = instanceProps.data;
    // render stub component when no data or children
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      instance.children.length > 0
    ) {
      return data.map((_item, index) => {
        return (
          <Fragment key={index}>
            {createInstanceChildrenElements({
              instances,
              // create fake indexed id to distinct items for select and hover
              instanceSelector: [
                getIndexedInstanceId(instance.id, index),
                ...instanceSelector,
              ],
              children: instance.children,
              Component: WebstudioComponentPreview,
              components,
            })}
          </Fragment>
        );
      });
    }
  }

  const Component = components.get(instance.component);
  if (Component === undefined) {
    return <></>;
  }
  return (
    <Component {...props} ref={ref}>
      {getTextContent(instanceProps) ??
        createInstanceChildrenElements({
          instances,
          instanceSelector,
          children: instance.children,
          Component: WebstudioComponentPreview,
          components,
        })}
    </Component>
  );
});
