import {
  useEffect,
  forwardRef,
  type ForwardedRef,
  useRef,
  useLayoutEffect,
  useMemo,
  Fragment,
  type ReactNode,
  type JSX,
} from "react";
import { $getSelection, $isRangeSelection } from "lexical";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRefs } from "@react-aria/utils";
import type {
  Instance,
  Instances,
  Prop,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  findTreeInstanceIds,
  collectionComponent,
  descendantComponent,
  blockComponent,
  blockTemplateComponent,
  getIndexesWithinAncestors,
} from "@webstudio-is/sdk";
import {
  idAttribute,
  componentAttribute,
  showAttribute,
  selectorIdAttribute,
  indexAttribute,
  type AnyComponent,
  textContentAttribute,
} from "@webstudio-is/react-sdk";
import { rawTheme } from "@webstudio-is/design-system";
import {
  $propValuesByInstanceSelectorWithMemoryProps,
  getIndexedInstanceId,
  $instances,
  $registeredComponentMetas,
  $selectedInstanceRenderState,
  findBlockSelector,
} from "~/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import {
  type InstanceSelector,
  areInstanceSelectorsEqual,
} from "~/shared/tree-utils";
import { setDataCollapsed } from "~/canvas/collapsed";
import { getIsVisuallyHidden } from "~/shared/visually-hidden";
import { serverSyncStore } from "~/shared/sync";
import { TextEditor } from "../text-editor";
import {
  $selectedPage,
  getInstanceKey,
  selectInstance,
} from "~/shared/awareness";
import {
  createInstanceChildrenElements,
  type WebstudioComponentProps,
} from "~/canvas/elements";
import { Block } from "../build-mode/block";
import { BlockTemplate } from "../build-mode/block-template";
import {
  editablePlaceholderAttribute,
  editingPlaceholderVariable,
} from "~/canvas/shared/styles";

const ContentEditable = ({
  placeholder,
  renderComponentWithRef,
}: {
  placeholder: string | undefined;
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
    const rootElement = ref.current;

    if (rootElement == null) {
      return;
    }

    if (getIsVisuallyHidden(rootElement)) {
      return;
    }

    if (rootElement.tagName === "A") {
      if (window.getComputedStyle(rootElement).display === "inline-flex") {
        // Issue: <a> tag doesn't work with inline-flex when the cursor is at the start or end of the text.
        // Solution: Inline-flex is not supported by Lexical. Use "inline" during editing.
        rootElement.style.display = "inline";
      }
    }

    // Issue: <button> with contentEditable does not allow pressing space.
    // Solution: Add space on space keydown.
    const abortController = new AbortController();
    if (rootElement.closest("button")) {
      rootElement.addEventListener(
        "keydown",
        (event) => {
          if (event.code === "Space") {
            editor.update(() => {
              const selection = $getSelection();

              if ($isRangeSelection(selection)) {
                selection.insertText(" ");
              }
            });

            event.preventDefault();
          }
        },
        { signal: abortController.signal }
      );

      // Some controls like Tab and TabTrigger intercept arrow keys for navigation.
      // Prevent propagation to avoid conflicts with Lexical's default behavior.
      rootElement.addEventListener(
        "keydown",
        (event) => {
          if (["ArrowLeft", "ArrowRight"].includes(event.code)) {
            event.stopPropagation();
          }
        },
        { signal: abortController.signal }
      );
    }

    rootElement.contentEditable = "true";

    editor.setRootElement(rootElement);

    // Must be done after 'setRootElement' to avoid Lexical's default behavior
    // white-space affects "text-wrap", remove it and use "white-space-collapse" instead
    rootElement.style.removeProperty("white-space");
    rootElement.style.setProperty("white-space-collapse", "pre-wrap");

    if (placeholder !== undefined) {
      rootElement.style.setProperty(
        editingPlaceholderVariable,
        `'${placeholder.replaceAll("'", "\\'")}'`
      );
    }

    return () => {
      abortController.abort();
    };
  }, [editor, placeholder]);

  return renderComponentWithRef(ref);
};

const ErrorStub = forwardRef<
  HTMLDivElement,
  {
    children?: ReactNode;
  }
>((props, ref) => {
  return (
    <div
      {...props}
      ref={ref}
      style={{
        padding: rawTheme.spacing[5],
        border: `1px solid ${rawTheme.colors.borderDestructiveMain}`,
        color: rawTheme.colors.foregroundDestructive,
      }}
    />
  );
});
ErrorStub.displayName = "ErrorStub";

const MissingComponentStub = forwardRef<
  HTMLDivElement,
  { children?: ReactNode }
>((props, ref) => {
  return (
    <ErrorStub ref={ref} {...props}>
      Component {props[componentAttribute as never]} does not exist
    </ErrorStub>
  );
});
MissingComponentStub.displayName = "MissingComponentStub";

const InvalidCollectionDataStub = forwardRef<
  HTMLDivElement,
  { children?: ReactNode }
>((props, ref) => {
  return (
    <ErrorStub ref={ref} {...props}>
      The Collection component requires an array in the data property. When
      binding external data, it is likely that the array is nested somewhere
      within, and you need to provide the correct path in the binding.{" "}
      <a
        style={{ color: "inherit" }}
        target="_blank"
        href="https://docs.webstudio.is/university/core-components/collection.md#whats-an-array"
        // avoid preventing click by events interceptor
        onClickCapture={(event) => event.stopPropagation()}
      >
        Learn more
      </a>
    </ErrorStub>
  );
});
InvalidCollectionDataStub.displayName = "InvalidCollectionDataStub";

const DroppableComponentStub = forwardRef<
  HTMLDivElement,
  { children?: ReactNode }
>((props, ref) => {
  return (
    <div {...props} ref={ref} style={{ display: "block" }}>
      {/* explicitly specify undefined to override passed children */}
      {undefined}
    </div>
  );
});
DroppableComponentStub.displayName = "DroppableComponentStub";

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
  const instanceKey = getInstanceKey(instanceSelector);
  const [instanceId] = instanceSelector;
  const $instancePropsObject = useMemo(() => {
    return computed(
      [$propValuesByInstanceSelectorWithMemoryProps, $indexesWithinAncestors],
      (propValuesByInstanceSelector, indexesWithinAncestors) => {
        const instancePropsObject: Record<Prop["name"], unknown> = {};
        const index = indexesWithinAncestors.get(instanceId);
        if (index !== undefined) {
          instancePropsObject[indexAttribute] = index.toString();
        }
        const instanceProps = propValuesByInstanceSelector.get(instanceKey);
        if (instanceProps) {
          for (const [name, value] of instanceProps) {
            instancePropsObject[name] = value;
          }
        }
        return instancePropsObject;
      }
    );
  }, [instanceKey, instanceId]);
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

const getEditableComponentPlaceholder = (
  instance: Instance,
  instanceSelector: InstanceSelector,
  instances: Instances,
  metas: Map<string, WsComponentMeta>,
  mode: "editing" | "editable"
) => {
  const meta = metas.get(instance.component);
  if (meta?.placeholder === undefined) {
    return;
  }

  const isContentBlockChild =
    undefined !== findBlockSelector(instanceSelector, instances);

  const isParagraph = instance.component === "Paragraph";

  if (isParagraph && isContentBlockChild) {
    return mode === "editing"
      ? "Write something or press '/' for commands..."
      : // The paragraph contains only an "editing" placeholder within the content block.
        undefined;
  }

  return meta.placeholder;
};

export const WebstudioComponentCanvas = forwardRef<
  HTMLElement,
  WebstudioComponentProps
>(({ instance, instanceSelector, components, ...restProps }, ref) => {
  const instanceId = instance.id;
  const instances = useStore($instances);
  const metas = useStore($registeredComponentMetas);

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

  let Component =
    components.get(instance.component) ??
    (MissingComponentStub as AnyComponent);

  if (instance.component === collectionComponent) {
    const data = instanceProps.data;
    if (data && Array.isArray(data) === false) {
      Component = InvalidCollectionDataStub as AnyComponent;
    } else if (
      // render stub component when no data or children
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
    } else {
      Component = DroppableComponentStub as AnyComponent;
    }
  }

  if (instance.component === descendantComponent) {
    return <></>;
  }

  if (instance.component === blockComponent) {
    Component = Block;
  }

  if (instance.component === blockTemplateComponent) {
    Component = BlockTemplate;
  }

  const mergedProps = mergeProps(restProps, instanceProps, "delete");

  const props: {
    [componentAttribute]: string;
    [idAttribute]: string;
    [selectorIdAttribute]: string;
  } & Record<string, unknown> = {
    ...mergedProps,
    // current props should override bypassed from parent
    // important for data-ws-* props
    tabIndex: 0,
    [selectorIdAttribute]: instanceSelector.join(","),
    [componentAttribute]: instance.component,
    [idAttribute]: instance.id,
    [editablePlaceholderAttribute]: getEditableComponentPlaceholder(
      instance,
      instanceSelector,
      instances,
      metas,
      "editable"
    ),
  };

  // React ignores defaultValue changes after first render.
  // Key prop forces re-creation to reflect updates on canvas.
  const key =
    props.defaultValue != null ? props.defaultValue.toString() : undefined;

  const instanceElement = (
    <>
      <Component key={key} {...props} ref={ref}>
        {children}
      </Component>
    </>
  );

  if (
    areInstanceSelectorsEqual(
      textEditingInstanceSelector?.selector,
      instanceSelector
    ) === false
  ) {
    initialContentEditableContent.current = children;
    return instanceElement;
  }

  return (
    <TextEditor
      rootInstanceSelector={instanceSelector}
      instances={instances}
      contentEditable={
        <ContentEditable
          placeholder={getEditableComponentPlaceholder(
            instance,
            instanceSelector,
            instances,
            metas,
            "editing"
          )}
          renderComponentWithRef={(elementRef) => (
            <Component {...props} ref={mergeRefs(ref, elementRef)}>
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
        selectInstance(newSelectedSelector);
      }}
    />
  );
});

export const WebstudioComponentPreview = forwardRef<
  HTMLElement,
  WebstudioComponentProps
>(({ instance, instanceSelector, components, ...restProps }, ref) => {
  const instances = useStore($instances);
  const { [showAttribute]: show = true, ...instanceProps } =
    useInstanceProps(instanceSelector);
  const props = {
    ...mergeProps(restProps, instanceProps, "merge"),
    [idAttribute]: instance.id,
    [componentAttribute]: instance.component,
    [selectorIdAttribute]: instanceSelector.join(","),
  };
  if (show === false) {
    return <></>;
  }

  if (instance.component === collectionComponent) {
    const data = instanceProps.data;
    // render nothing when no data or children
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

  if (instance.component === descendantComponent) {
    return <></>;
  }

  let Component = components.get(instance.component);

  if (instance.component === blockComponent) {
    Component = Block;
  }

  if (instance.component === blockTemplateComponent) {
    Component = BlockTemplate;
  }

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
