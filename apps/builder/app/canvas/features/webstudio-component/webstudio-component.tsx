import {
  type MouseEvent,
  type FormEvent,
  useEffect,
  forwardRef,
  type ForwardedRef,
  useRef,
  useLayoutEffect,
  useContext,
} from "react";
import { Suspense, lazy } from "react";
import { useStore } from "@nanostores/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import store from "immerhin";
import {
  type Instance,
  findTreeInstanceIds,
  Instances,
} from "@webstudio-is/project-build";
import {
  type Components,
  renderWebstudioComponentChildren,
  idAttribute,
  componentAttribute,
  showAttribute,
  useInstanceProps,
  selectorIdAttribute,
  ReactSdkContext,
} from "@webstudio-is/react-sdk";
import {
  instancesStore,
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
import { handleLinkClick } from "./link";
import { mergeRefs } from "@react-aria/utils";
import { composeEventHandlers } from "@radix-ui/primitive";
import { setDataCollapsed } from "~/canvas/collapsed";
import { getIsVisuallyHidden } from "~/shared/visually-hidden";

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

    if (rootElement?.tagName === "BUTTON") {
      // button with contentEditable does not let to press space
      // so add span inside and use it as editor element in lexical
      const span = document.createElement("span");
      span.contentEditable = "true";
      const child = rootElement.firstChild;
      if (child !== null) {
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
 * For some components that are wrapped with Radix Slot-like components (Triggers etc where asChild=true),
 * Slots in react-aria https://react-spectrum.adobe.com/react-spectrum/layout.html#slots
 * events are passed implicitly. We aim to merge these implicit events with the explicitly defined ones.
 **/
type ImplicitEvents = {
  onClick?: undefined | ((event: never) => void);
  onSubmit?: undefined | ((event: never) => void);
  /**
   * We ignore the remaining events because we currently detect events using the 'on' prefix.
   * This approach (defining type like above instead of Partial<Record<`on${string}`, Handler>>)
   * is necessary due to our TypeScript settings, where 'no exactOptionalPropertyTypes' is set,
   * which makes it impossible to define a Partial<Record<>> with optional keys.
   *  (without exactOptionalPropertyTypes ts defines it as {[key: string]: Handler | undefined)}
   *   instead of {[key: string]?: Handler | undefined)})
   **/
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

// eslint-disable-next-line react/display-name
export const WebstudioComponentDev = forwardRef<
  HTMLElement,
  WebstudioComponentDevProps & ImplicitEvents
>(({ instance, instanceSelector, children, components, ...restProps }, ref) => {
  const { renderer } = useContext(ReactSdkContext);
  const instanceId = instance.id;
  const instanceStyles = useInstanceStyles(instanceId);
  useCssRules({ instanceId: instance.id, instanceStyles });
  const instances = useStore(instancesStore);

  const textEditingInstanceSelector = useStore(
    textEditingInstanceSelectorStore
  );

  const { [showAttribute]: show = true, ...instanceProps } = useInstanceProps(
    instance.id
  );

  /**
   * Prevents edited element from having a size of 0 on the first render.
   * Directly using `renderWebstudioComponentChildren(children)` in Text Edit
   * conflicts with React due to lexical node changes.
   */
  const initialContentEditableContent = useRef(
    renderWebstudioComponentChildren(children)
  );

  useCollapsedOnNewElement(instanceId);

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

  const Component = components.get(instance.component);

  if (show === false) {
    return <></>;
  }

  if (Component === undefined) {
    return <></>;
  }

  const props: {
    [componentAttribute]: string;
    [idAttribute]: string;
  } & Record<string, unknown> = {
    ...instanceProps,
    tabIndex: 0,
    onClick: (event: MouseEvent) => {
      if (event.currentTarget instanceof HTMLAnchorElement) {
        // @todo use Navigation API once implemented everywhere
        // https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
        handleLinkClick(event);
        event.preventDefault();
      } else if (typeof instanceProps.onClick === "function") {
        // bypass onClick for non-link component, for example button
        instanceProps.onClick(event);
      }
    },
    onSubmit: (event: FormEvent) => {
      // Prevent submitting the form when clicking a button type submit
      event.preventDefault();
      if (typeof instanceProps.onSubmit === "function") {
        // bypass handler
        instanceProps.onSubmit(event);
      }
    },
    [componentAttribute]: instance.component,
    [idAttribute]: instance.id,
    [selectorIdAttribute]: instanceSelector.join(","),
  };

  if (renderer === "canvas") {
    if (instance.component === "Input" || instance.component === "Textarea") {
      props.readOnly = true;
    }
  }

  for (const [name, value] of Object.entries(restProps)) {
    if (typeof value === "function") {
      // prevent passing any callbacks from outside while in canvas mode
      // for example radix triggers bypass callbacks to button child
      if (renderer === "canvas") {
        continue;
      }
      /**
       * We combine Radix's implicit event handlers with user-defined ones,
       * such as onClick or onSubmit. For instance, a Button within
       * a TooltipTrigger receives an onClick handler from the TooltipTrigger.
       * We might also need an additional onClick handler on the Button for other
       * purposes (setting variable).
       **/
      if (name.startsWith("on") && typeof props[name] === "function") {
        props[name] = composeEventHandlers(value, props[name] as typeof value);
        continue;
      }
    }
    // current props should override bypassed from parent
    // important for data-ws-* props
    props[name] = props[name] ?? value;
  }

  const instanceElement = (
    <>
      <Component {...props} ref={ref}>
        {renderWebstudioComponentChildren(children)}
      </Component>
    </>
  );

  if (
    areInstanceSelectorsEqual(textEditingInstanceSelector, instanceSelector) ===
    false
  ) {
    initialContentEditableContent.current =
      renderWebstudioComponentChildren(children);
    return instanceElement;
  }

  return (
    <Suspense fallback={instanceElement}>
      <TextEditor
        rootInstanceSelector={instanceSelector}
        instances={instances}
        contentEditable={
          <ContentEditable
            renderComponentWithRef={(elementRef) => (
              <Component {...props} ref={mergeRefs(ref, elementRef)}>
                {initialContentEditableContent.current}
              </Component>
            )}
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
