import {
  type MouseEvent,
  type FormEvent,
  useEffect,
  forwardRef,
  type RefObject,
  useState,
} from "react";
import { Suspense, lazy, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import store from "immerhin";
import {
  type Instance,
  findTreeInstanceIds,
  Instances,
} from "@webstudio-is/project-build";
import {
  type AnyComponent,
  type Components,
  renderWebstudioComponentChildren,
  idAttribute,
  componentAttribute,
  showAttribute,
  useInstanceProps,
  selectorIdAttribute,
} from "@webstudio-is/react-sdk";
import {
  instancesStore,
  isPreviewModeStore,
  selectedInstanceRenderStateStore,
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
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
import { mergeRefs } from "@react-aria/utils";

const TextEditor = lazy(() => import("../text-editor"));

const ContentEditable = ({
  Component,
  elementRef,
  ...props
}: {
  Component: AnyComponent;
  elementRef: { current: null | HTMLElement };
  [idAttribute]: Instance["id"];
  [componentAttribute]: Instance["component"];
}) => {
  const [editor] = useLexicalComposerContext();

  const ref = useCallback(
    (rootElement: null | HTMLElement) => {
      // button with contentEditable does not let to press space
      // so add span inside and use it as editor element in lexical
      if (rootElement?.tagName === "BUTTON") {
        const span = document.createElement("span");
        span.contentEditable = "true";
        rootElement.appendChild(span);
        rootElement = span;
      }
      if (rootElement) {
        rootElement.contentEditable = "true";
      }
      editor.setRootElement(rootElement);
      elementRef.current = rootElement ?? null;
    },
    [editor, elementRef]
  );

  return <Component ref={ref} {...props} />;
};

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
  components: Components;
};

/**
 * Radix uses VisuallyHiddenPrimitive.Root component to expose content of various hidden elements to screen readers
 * https://github.com/radix-ui/primitives/blob/main/packages/react/visually-hidden/src/VisuallyHidden.tsx
 *
 * It's done but just using same Conent children, what cause duplicated react elements
 * and breaks our isSelected logic.
 *
 * To avoid this we try to detect if instance is descendant of VisuallyHiddenPrimitive.Root and do not render it
 */
const useIsScreenReaderDescendant = (ref: RefObject<HTMLElement>) => {
  const [isScreenReaderDescendant, setIsScreenReaderDescendant] =
    useState(false);

  useEffect(() => {
    if (ref.current !== null) {
      for (
        let element: HTMLElement | null = ref.current;
        element !== null;
        element = element.parentElement
      ) {
        if (
          element.style.overflow === "hidden" &&
          element.style.clip === "rect(0px, 0px, 0px, 0px)" &&
          element.style.position === "absolute" &&
          element.style.width === "1px" &&
          element.style.height === "1px"
        ) {
          setIsScreenReaderDescendant(true);
          return;
        }
      }
    }
  }, [ref]);

  return isScreenReaderDescendant;
};

// eslint-disable-next-line react/display-name
export const WebstudioComponentDev = forwardRef<
  HTMLElement,
  WebstudioComponentDevProps
>(({ instance, instanceSelector, children, components, ...restProps }, ref) => {
  const instanceId = instance.id;
  const instanceElementRef = useRef<HTMLElement>(null);
  const instanceStyles = useInstanceStyles(instanceId);
  useCssRules({ instanceId: instance.id, instanceStyles });
  const instances = useStore(instancesStore);

  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const textEditingInstanceSelector = useStore(
    textEditingInstanceSelectorStore
  );

  const instanceProps = useInstanceProps(instance.id);
  const { [showAttribute]: show = true, ...userProps } = instanceProps;

  const isSelected = areInstanceSelectorsEqual(
    selectedInstanceSelector,
    instanceSelector
  );
  const isPreviewMode = useStore(isPreviewModeStore);

  // Scroll the selected instance into view when selected from navigator.
  useEffect(() => {
    if (isSelected) {
      instanceElementRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isSelected]);

  // this assumes presence of `useStore(selectedInstanceSelectorStore)` above
  // we rely on root re-rendering after selected instance changes
  useEffect(() => {
    // 1 means root
    if (instanceSelector.length === 1) {
      // If by the time root is rendered,
      // no selected instance renders and sets state to "mounted",
      // then it's clear that selected instance will not render at all, so we set it to "notMounted"
      if (selectedInstanceRenderStateStore.get() === "pending") {
        selectedInstanceRenderStateStore.set("notMounted");
      }
    }
  });

  const isScreenReaderDescendant =
    useIsScreenReaderDescendant(instanceElementRef);
  if (isScreenReaderDescendant) {
    return <></>;
  }

  const readonlyProps =
    isPreviewMode === false &&
    (instance.component === "Input" || instance.component === "Textarea")
      ? { readOnly: true }
      : undefined;

  const Component = components.get(instance.component);

  if (show === false) {
    return <></>;
  }

  if (Component === undefined) {
    return <></>;
  }

  const props = {
    ...userProps,
    ...readonlyProps,
    tabIndex: 0,
    [componentAttribute]: instance.component,
    [idAttribute]: instance.id,
    [selectorIdAttribute]: instanceSelector.join(","),
    onClick: (event: MouseEvent) => {
      event.preventDefault();
      if (event.currentTarget instanceof HTMLAnchorElement) {
        // @todo use Navigation API once implemented everywhere
        // https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
        handleLinkClick(event);
      } else if (typeof userProps.onClick === "function") {
        // bypass onClick for non-link component, for example button
        userProps.onClick(event);
      }
    },
    onSubmit: (event: FormEvent) => {
      // Prevent submitting the form when clicking a button type submit
      event.preventDefault();
      if (typeof userProps.onSubmit === "function") {
        // bypass handler
        userProps.onSubmit(event);
      }
    },
  };

  const instanceElement = (
    <>
      {isSelected && (
        <SelectedInstanceConnector
          instanceElementRef={instanceElementRef}
          instance={instance}
          instanceSelector={instanceSelector}
          instanceStyles={instanceStyles}
          instanceProps={instanceProps}
        />
      )}
      {/* @todo restProps are radix events and props, for event handlers we need to composeEventHandlers like in radix */}
      <Component
        {...restProps}
        {...props}
        ref={mergeRefs(instanceElementRef, ref)}
      >
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
});
