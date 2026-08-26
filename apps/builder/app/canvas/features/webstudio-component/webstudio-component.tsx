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
  collectionComponent,
  descendantComponent,
  blockComponent,
  blockTemplateComponent,
  getIndexesWithinAncestors,
  getContentBlockSource,
  elementComponent,
} from "@webstudio-is/sdk";
import { indexProperty, tagProperty } from "@webstudio-is/sdk/runtime";
import {
  idAttribute,
  componentAttribute,
  showAttribute,
  selectorIdAttribute,
  type AnyComponent,
  textContentAttribute,
  standardAttributesToReactProps,
  getCollectionEntries,
} from "@webstudio-is/react-sdk";
import { rawTheme, toast } from "@webstudio-is/design-system";
import {
  Input,
  Link,
  Select,
  Textarea,
} from "@webstudio-is/sdk-components-react/components";
import { LinkCurrentUrlContext } from "@webstudio-is/sdk-components-react";
import {
  $propValuesByInstanceSelectorWithMemoryProps,
  getIndexedInstanceId,
  $registeredComponentMetas,
  $variableValuesByInstanceSelector,
  $isDesignMode,
  $selectedInstanceRenderState,
  $selectedPageHash,
} from "~/shared/nano-states";
import { $project, $props } from "~/shared/sync/data-stores";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import {
  type InstanceSelector,
  areInstanceSelectorsEqual,
} from "@webstudio-is/project-build/runtime";
import { findBlockSelector } from "@webstudio-is/project-build/runtime";
import { inflateInstance } from "~/canvas/inflator";
import { getIsVisuallyHidden } from "~/shared/visually-hidden";
import { TextEditor } from "../text-editor";
import { $selectedPage, getInstanceKey } from "~/shared/nano-states";
import { selectInstance } from "~/shared/nano-states";
import { $currentSystem } from "~/shared/system";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
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
import { richTextPlaceholders } from "@webstudio-is/project-build/runtime";
import { acquireExternalContentRoot } from "~/shared/external-content-roots";
import {
  $externalContentRoots,
  findExternalContentRoot,
  getExternalContentRoots,
  resolveExternalContentOccurrence,
} from "~/shared/external-content-mutations";
import {
  formatContentBlockDiagnostic,
  takeNewContentBlockDiagnostics,
} from "~/shared/content-block-diagnostics";
import { resolveContentBlockOccurrenceAssetId } from "~/shared/content-block-source-utils";

const computeComponentKey = (props: Record<string, unknown>) => {
  const assetId = props.$webstudio$canvasOnly$assetId;
  const src = props.src;
  const defaultValue = props.defaultValue;

  return (
    (typeof assetId === "string" ? assetId : undefined) ??
    (defaultValue != null ? String(defaultValue) : undefined) ??
    (src != null ? String(src) : undefined)
  );
};

const getPreviewCurrentUrl = (
  currentSystem: {
    pathname: string;
    search: Record<string, string | undefined>;
  },
  hash: string
) => {
  // Preview renders inside the builder canvas route, so window.location points
  // at the builder shell, not the page being previewed. Recreate the page URL
  // from the selected page system data so :local-link state matches preview
  // navigation, including query params and hash-only links.
  const currentUrl = new URL(currentSystem.pathname, "https://webstudio.local");
  currentUrl.search = new URLSearchParams(
    Object.entries(currentSystem.search).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  ).toString();
  currentUrl.hash = hash;
  return currentUrl;
};

export const __testing__ = { computeComponentKey, getPreviewCurrentUrl };

const PreviewLinkCurrentUrlProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const currentSystem = useStore($currentSystem);
  const selectedPageHash = useStore($selectedPageHash);
  const currentUrl = getPreviewCurrentUrl(currentSystem, selectedPageHash.hash);

  return (
    <LinkCurrentUrlContext.Provider value={currentUrl}>
      {children}
    </LinkCurrentUrlContext.Provider>
  );
};

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
        href="https://docs.webstudio.is/university/core-components/collection#whats-an-array"
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
  return;
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
      [
        $propValuesByInstanceSelectorWithMemoryProps,
        $instances,
        $indexesWithinAncestors,
        $registeredComponentMetas,
      ],
      (
        propValuesByInstanceSelector,
        instances,
        indexesWithinAncestors,
        metas
      ) => {
        const instancePropsObject: Record<Prop["name"], unknown> = {};
        const instance = instances.get(instanceId);
        const tag = instance?.tag;
        if (tag !== undefined) {
          instancePropsObject[tagProperty] = tag;
        }
        const meta = metas.get(instance?.component ?? "");
        const hasTags = Object.keys(meta?.presetStyle ?? {}).length > 0;
        const index = indexesWithinAncestors.get(instanceId);
        if (index !== undefined) {
          instancePropsObject[indexProperty] = index.toString();
        }
        const instanceProps = propValuesByInstanceSelector.get(instanceKey);
        if (instanceProps) {
          for (const [name, value] of instanceProps) {
            let propName = name;
            // convert html attribute only when component has tags
            // and does not specify own property with this name
            if (hasTags && !meta?.props?.[propName]) {
              propName = standardAttributesToReactProps[propName] ?? propName;
            }
            instancePropsObject[propName] = value;
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
 * We are identifying newly created instances like Tooltips and ensuring the calculation of 'inflated' elements.
 */
const useInflateOnNewElement = (instanceId: Instance["id"]) => {
  useEffect(() => {
    if (existingElements.has(instanceId) === false) {
      inflateInstance(instanceId);
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
  const tags = Object.keys(meta?.presetStyle ?? {});
  const tag = instance.tag ?? tags[0];
  const placeholder = richTextPlaceholders.get(tag);
  if (placeholder === undefined) {
    return;
  }
  const isContentBlockChild =
    undefined !== findBlockSelector({ anchor: instanceSelector, instances });
  // The paragraph contains only an "editing" placeholder within the content block.
  if (tag === "p" && isContentBlockChild && mode === "editing") {
    return "Write something or press '/' for commands...";
  }
  return placeholder;
};

const ExternalContentRootLoader = ({
  instance,
  instanceSelector,
  includeUnresolvedTemplatePlaceholders,
  showDiagnostics,
}: {
  instance: Instance;
  instanceSelector: InstanceSelector;
  includeUnresolvedTemplatePlaceholders: boolean;
  showDiagnostics: boolean;
}) => {
  const allProps = useStore($props);
  const project = useStore($project);
  const variableValues = useStore($variableValuesByInstanceSelector);
  const externalContentRoots = useStore($externalContentRoots);
  const renderScope = getInstanceKey(instanceSelector);
  const source = useMemo(
    () =>
      getContentBlockSource({
        blockInstanceId: instance.id,
        props: allProps.values(),
      }),
    [allProps, instance.id]
  );
  const sourceAssetId = useMemo(() => {
    if (source === undefined) {
      return;
    }
    return resolveContentBlockOccurrenceAssetId({
      source,
      instanceSelector,
      variableValuesByRenderScope: variableValues,
    });
  }, [instanceSelector, source, variableValues]);

  const diagnosticsSnapshot = findExternalContentRoot(
    externalContentRoots,
    instance.id,
    renderScope
  );

  useEffect(() => {
    if (showDiagnostics === false) {
      return;
    }
    for (const diagnostic of takeNewContentBlockDiagnostics(
      diagnosticsSnapshot?.diagnostics ?? [],
      diagnosticsSnapshot?.identity?.revision
    )) {
      toast.warn(formatContentBlockDiagnostic(diagnostic));
    }
  }, [
    diagnosticsSnapshot?.diagnostics,
    diagnosticsSnapshot?.identity?.revision,
    showDiagnostics,
  ]);

  useLayoutEffect(() => {
    if (project === undefined || sourceAssetId === undefined) {
      return;
    }
    let active = true;
    const controller = new AbortController();
    let release: (() => void) | undefined;
    void acquireExternalContentRoot({
      projectId: project.id,
      assetId: sourceAssetId,
      blockInstanceId: instance.id,
      renderScope,
      includeUnresolvedTemplatePlaceholders,
      signal: controller.signal,
    })
      .then((nextRelease) => {
        if (active === false) {
          nextRelease();
          return;
        }
        release = nextRelease;
      })
      .catch((error) => {
        if (active) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load MDX content"
          );
        }
      });
    return () => {
      active = false;
      controller.abort();
      release?.();
    };
  }, [
    includeUnresolvedTemplatePlaceholders,
    instance.id,
    project,
    renderScope,
    sourceAssetId,
  ]);
  return null;
};

const getExternalContentInstance = ({
  sourceInstance,
  sourceInstanceSelector,
  instances,
}: {
  sourceInstance: Instance;
  sourceInstanceSelector: InstanceSelector;
  instances: Instances;
}) => {
  const occurrence = resolveExternalContentOccurrence({
    sourceInstance,
    sourceSelector: sourceInstanceSelector,
    instances,
    roots: getExternalContentRoots(),
  });
  return occurrence === undefined
    ? undefined
    : { instance: occurrence.instance, instanceSelector: occurrence.selector };
};

const WebstudioComponentCanvasInner = forwardRef<
  HTMLElement,
  WebstudioComponentProps
>(({ instance, instanceSelector, components, ...restProps }, ref) => {
  const instanceId = instance.id;
  const instances = useStore($instances);
  const allProps = useStore($props);
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

  useInflateOnNewElement(instanceId);

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

  let Component: string | AnyComponent =
    components.get(instance.component) ??
    (MissingComponentStub as AnyComponent);

  if (instance.component === elementComponent) {
    Component = instance.tag ?? "div";
    // replace to enable uncontrolled state
    if (Component === "input") {
      Component = Input as AnyComponent;
    }
    if (Component === "textarea") {
      Component = Textarea as AnyComponent;
    }
    if (Component === "select") {
      Component = Select as AnyComponent;
    }
  }

  if (instance.component === collectionComponent) {
    const originalData = instanceProps.data;
    if (originalData && instance.children.length > 0) {
      const entries = getCollectionEntries(originalData);
      if (entries.length > 0) {
        return entries.map(([key]) => (
          <Fragment key={key}>
            {createInstanceChildrenElements({
              instances,
              instanceSelector: [
                getIndexedInstanceId(instance.id, key),
                ...instanceSelector,
              ],
              children: instance.children,
              Component: WebstudioComponentCanvas,
              components,
            })}
          </Fragment>
        ));
      }
    }
    Component = DroppableComponentStub as AnyComponent;
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
  // Also use assetId to recreate component when asset changes (e.g., deleted, replaced)
  // For expressions that resolve to asset URLs (via assets resource), use the src value itself
  const key = computeComponentKey(props);

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

  const contentModel = metas.get(instance.component)?.contentModel;
  return (
    <TextEditor
      rootInstanceSelector={instanceSelector}
      instances={instances}
      props={allProps}
      plainText={
        contentModel?.children.length === 1 &&
        contentModel.children[0] === "text"
      }
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
            <Component
              {...props}
              data-ws-text-editing=""
              ref={mergeRefs(ref, elementRef)}
            >
              {initialContentEditableContent.current}
            </Component>
          )}
        />
      }
      onChange={(instancesList) => {
        const result = executeRuntimeMutation({
          id: "instances.updateTextTree",
          input: {
            rootInstanceId: instance.id,
            instances: instancesList,
          },
        });
        return result?.result.idMap;
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

export const WebstudioComponentCanvas = forwardRef<
  HTMLElement,
  WebstudioComponentProps
>(({ instance, instanceSelector, ...props }, ref) => {
  const instances = useStore($instances);
  const isDesignMode = useStore($isDesignMode);
  const externalContent = isDesignMode
    ? undefined
    : getExternalContentInstance({
        sourceInstance: instance,
        sourceInstanceSelector: instanceSelector,
        instances,
      });
  const renderedInstance = externalContent?.instance ?? instance;
  const renderedInstanceSelector =
    externalContent?.instanceSelector ?? instanceSelector;
  return (
    <>
      {instance.component === blockComponent ? (
        <ExternalContentRootLoader
          instance={instance}
          instanceSelector={instanceSelector}
          includeUnresolvedTemplatePlaceholders={true}
          showDiagnostics={true}
        />
      ) : null}
      <WebstudioComponentCanvasInner
        {...props}
        ref={ref}
        instance={renderedInstance}
        instanceSelector={renderedInstanceSelector}
      />
    </>
  );
});

const WebstudioComponentPreviewInner = forwardRef<
  HTMLElement,
  WebstudioComponentProps
>(({ instance, instanceSelector, components, ...restProps }, ref) => {
  const instances = useStore($instances);
  const { [showAttribute]: show = true, ...instanceProps } =
    useInstanceProps(instanceSelector);
  const props: {
    [componentAttribute]: string;
    [idAttribute]: string;
    [selectorIdAttribute]: string;
  } & Record<string, unknown> = {
    ...mergeProps(restProps, instanceProps, "merge"),
    [idAttribute]: instance.id,
    [componentAttribute]: instance.component,
    [selectorIdAttribute]: instanceSelector.join(","),
  };
  if (show === false) {
    return <></>;
  }

  if (instance.component === collectionComponent) {
    const originalData = instanceProps.data;
    if (originalData && instance.children.length > 0) {
      const entries = getCollectionEntries(originalData);
      if (entries.length > 0) {
        return entries.map(([key]) => (
          <Fragment key={key}>
            {createInstanceChildrenElements({
              instances,
              instanceSelector: [
                getIndexedInstanceId(instance.id, key),
                ...instanceSelector,
              ],
              children: instance.children,
              Component: WebstudioComponentPreview,
              components,
            })}
          </Fragment>
        ));
      }
    }
  }

  if (instance.component === descendantComponent) {
    return <></>;
  }

  let Component: undefined | string | AnyComponent = components.get(
    instance.component
  );

  if (instance.component === elementComponent) {
    Component = instance.tag ?? "div";
    // replace to enable uncontrolled state
    if (Component === "input") {
      Component = Input as AnyComponent;
    }
    if (Component === "textarea") {
      Component = Textarea as AnyComponent;
    }
    if (Component === "select") {
      Component = Select as AnyComponent;
    }
    if (Component === "a") {
      Component = Link as AnyComponent;
    }
  }

  if (instance.component === blockComponent) {
    Component = Block;
  }

  if (instance.component === blockTemplateComponent) {
    Component = BlockTemplate;
  }

  if (Component === undefined) {
    return <></>;
  }

  const element = (
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

  if (
    instance.component === "Link" ||
    instance.component === "RichTextLink" ||
    (instance.component === elementComponent && instance.tag === "a")
  ) {
    return (
      <PreviewLinkCurrentUrlProvider>{element}</PreviewLinkCurrentUrlProvider>
    );
  }

  return element;
});

export const WebstudioComponentPreview = forwardRef<
  HTMLElement,
  WebstudioComponentProps
>(({ instance, instanceSelector, ...props }, ref) => {
  const instances = useStore($instances);
  const externalContent = getExternalContentInstance({
    sourceInstance: instance,
    sourceInstanceSelector: instanceSelector,
    instances,
  });
  const renderedInstance = externalContent?.instance ?? instance;
  const renderedInstanceSelector =
    externalContent?.instanceSelector ?? instanceSelector;
  return (
    <>
      {instance.component === blockComponent ? (
        <ExternalContentRootLoader
          instance={instance}
          instanceSelector={instanceSelector}
          includeUnresolvedTemplatePlaceholders={false}
          showDiagnostics={false}
        />
      ) : null}
      <WebstudioComponentPreviewInner
        {...props}
        ref={ref}
        instance={renderedInstance}
        instanceSelector={renderedInstanceSelector}
      />
    </>
  );
});
