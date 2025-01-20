import { useMemo, useEffect, useState, useLayoutEffect, useRef } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { useStore } from "@nanostores/react";
import { type Instances, coreMetas, corePropsMetas } from "@webstudio-is/sdk";
import { coreTemplates } from "@webstudio-is/sdk/core-templates";
import type { Components } from "@webstudio-is/react-sdk";
import { wsImageLoader } from "@webstudio-is/image";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as baseComponentPropsMetas from "@webstudio-is/sdk-components-react/props";
import { hooks as baseComponentHooks } from "@webstudio-is/sdk-components-react/hooks";
import * as baseComponentTemplates from "@webstudio-is/sdk-components-react/templates";
import * as animationComponents from "@webstudio-is/sdk-components-animation";
import * as animationComponentMetas from "@webstudio-is/sdk-components-animation/metas";
import * as animationComponentPropsMetas from "@webstudio-is/sdk-components-animation/props";
import * as animationTemplates from "@webstudio-is/sdk-components-animation/templates";
import { hooks as animationComponentHooks } from "@webstudio-is/sdk-components-animation/hooks";
import * as radixComponents from "@webstudio-is/sdk-components-react-radix";
import * as radixComponentMetas from "@webstudio-is/sdk-components-react-radix/metas";
import * as radixComponentPropsMetas from "@webstudio-is/sdk-components-react-radix/props";
import * as radixTemplates from "@webstudio-is/sdk-components-react-radix/templates";
import { hooks as radixComponentHooks } from "@webstudio-is/sdk-components-react-radix/hooks";
import { ErrorMessage } from "~/shared/error";
import { $publisher, publish } from "~/shared/pubsub";
import {
  registerContainers,
  serverSyncStore,
  useCanvasStore,
} from "~/shared/sync";
import {
  GlobalStyles,
  subscribeStyles,
  mountStyles,
  manageDesignModeStyles,
  manageContentEditModeStyles,
} from "./shared/styles";
import {
  WebstudioComponentCanvas,
  WebstudioComponentPreview,
} from "./features/webstudio-component";
import {
  $assets,
  $pages,
  $instances,
  registerComponentLibrary,
  $registeredComponents,
  subscribeComponentHooks,
  $isPreviewMode,
  $isDesignMode,
  $isContentMode,
  subscribeModifierKeys,
  assetBaseUrl,
} from "~/shared/nano-states";
import { useDragAndDrop } from "./shared/use-drag-drop";
import {
  initCopyPaste,
  initCopyPasteForContentEditMode,
} from "~/shared/copy-paste/init-copy-paste";
import { setDataCollapsed, subscribeCollapsed } from "./collapsed";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";
import { subscribeInstanceSelection } from "./instance-selection";
import { subscribeInstanceHovering } from "./instance-hovering";
import { useHashLinkSync } from "~/shared/pages";
import { useMount } from "~/shared/hook-utils/use-mount";
import { subscribeInterceptedEvents } from "./interceptor";
import { subscribeCommands } from "~/canvas/shared/commands";
import { updateCollaborativeInstanceRect } from "./collaborative-instance";
import { initCanvasApi } from "~/shared/canvas-api";
import { subscribeFontLoadingDone } from "./shared/font-weight-support";
import { useDebounceEffect } from "~/shared/hook-utils/use-debounce-effect";
import { subscribeSelected } from "./instance-selected";
import { subscribeScrollNewInstanceIntoView } from "./shared/scroll-new-instance-into-view";
import { $selectedPage } from "~/shared/awareness";
import { createInstanceElement } from "./elements";
import { Body } from "./shared/body";
import { subscribeScrollbarSize } from "./scrollbar-width";

registerContainers();

const FallbackComponent = ({ error, resetErrorBoundary }: FallbackProps) => {
  // try to recover from error when webstudio data is changed again
  useEffect(() => {
    return serverSyncStore.subscribe(resetErrorBoundary);
  }, [resetErrorBoundary]);
  return (
    // body is required to prevent breaking collapsed instances logic
    <body>
      <ErrorMessage
        error={{
          message: error instanceof Error ? error.message : "Unknown error",
          status: 500,
        }}
      />
    </body>
  );
};

const useElementsTree = (components: Components, instances: Instances) => {
  const page = useStore($selectedPage);
  const isPreviewMode = useStore($isPreviewMode);
  const rootInstanceId = page?.rootInstanceId ?? "";

  if (typeof window === "undefined") {
    // @todo remove after https://github.com/webstudio-is/webstudio/issues/1313 now its needed to be sure that no leaks exists

    console.info({
      $assets: $assets.get().size,
      $pages: $pages.get()?.pages.length ?? 0,
      $instances: $instances.get().size,
    });
  }

  return useMemo(() => {
    return (
      <ReactSdkContext.Provider
        value={{
          renderer: isPreviewMode ? "preview" : "canvas",
          assetBaseUrl,
          imageLoader: wsImageLoader,
          resources: {},
        }}
      >
        {createInstanceElement({
          instances,
          instanceId: rootInstanceId,
          instanceSelector: [rootInstanceId],
          Component: isPreviewMode
            ? WebstudioComponentPreview
            : WebstudioComponentCanvas,
          components,
        })}
      </ReactSdkContext.Provider>
    );
  }, [instances, rootInstanceId, components, isPreviewMode]);
};

const DesignMode = () => {
  const debounceEffect = useDebounceEffect();
  const ref = useRef<undefined | Instances>(undefined);

  useDragAndDrop();

  useEffect(() => {
    const abortController = new AbortController();
    subscribeScrollNewInstanceIntoView(
      debounceEffect,
      ref,
      abortController.signal
    );
    const unsubscribeSelected = subscribeSelected(debounceEffect);
    return () => {
      unsubscribeSelected();
      abortController.abort();
    };
  }, [debounceEffect]);

  useEffect(() => {
    const abortController = new AbortController();
    const options = { signal: abortController.signal };
    // We need to initialize this in both canvas and builder,
    // because the events will fire in either one, depending on where the focus is
    // @todo we need to forward the events from canvas to builder and avoid importing this
    // in both places
    initCopyPaste(options);
    manageDesignModeStyles(options);
    subscribeScrollbarSize(options);
    updateCollaborativeInstanceRect(options);
    subscribeInstanceSelection(options);
    subscribeInstanceHovering(options);
    subscribeFontLoadingDone(options);
    subscribeModifierKeys(options);
    return () => {
      abortController.abort();
    };
  }, []);
  return null;
};

const ContentEditMode = () => {
  const debounceEffect = useDebounceEffect();
  const ref = useRef<undefined | Instances>(undefined);

  useEffect(() => {
    const abortController = new AbortController();
    subscribeScrollNewInstanceIntoView(
      debounceEffect,
      ref,
      abortController.signal
    );
    const unsubscribeSelected = subscribeSelected(debounceEffect);
    return () => {
      unsubscribeSelected();
      abortController.abort();
    };
  }, [debounceEffect]);

  useEffect(() => {
    const abortController = new AbortController();
    const options = { signal: abortController.signal };
    manageContentEditModeStyles(options);
    subscribeScrollbarSize(options);
    subscribeInstanceSelection(options);
    subscribeInstanceHovering(options);
    subscribeFontLoadingDone(options);
    initCopyPasteForContentEditMode(options);
    subscribeModifierKeys(options);
    return () => {
      abortController.abort();
    };
  }, []);
  return null;
};

export const Canvas = () => {
  useCanvasStore();
  const isDesignMode = useStore($isDesignMode);
  const isContentMode = useStore($isContentMode);

  useMount(() => {
    registerComponentLibrary({
      components: {},
      metas: coreMetas,
      propsMetas: corePropsMetas,
      templates: coreTemplates,
    });
    registerComponentLibrary({
      components: baseComponents,
      metas: baseComponentMetas,
      propsMetas: baseComponentPropsMetas,
      hooks: baseComponentHooks,
      templates: baseComponentTemplates,
    });
    registerComponentLibrary({
      components: {
        // override only canvas specific body component
        // not related to sdk-components-react-remix anymore
        Body,
      },
      metas: {},
      propsMetas: {},
      templates: {},
    });
    registerComponentLibrary({
      namespace: "@webstudio-is/sdk-components-react-radix",
      components: radixComponents,
      metas: radixComponentMetas,
      propsMetas: radixComponentPropsMetas,
      hooks: radixComponentHooks,
      templates: radixTemplates,
    });
    registerComponentLibrary({
      namespace: "@webstudio-is/sdk-components-animation",
      components: animationComponents,
      metas: animationComponentMetas,
      propsMetas: animationComponentPropsMetas,
      hooks: animationComponentHooks,
      templates: animationTemplates,
    });
  });

  useMount(initCanvasApi);

  useLayoutEffect(() => {
    mountStyles();
  }, []);

  useEffect(subscribeStyles, []);

  useEffect(subscribeComponentHooks, []);

  useEffect(subscribeCommands, []);

  useEffect(() => {
    $publisher.set({ publish });
  }, []);

  const selectedPage = useStore($selectedPage);

  useEffect(() => {
    const rootInstanceId = selectedPage?.rootInstanceId;
    if (rootInstanceId !== undefined) {
      setDataCollapsed(rootInstanceId);
    }
  });

  useWindowResizeDebounced(() => {
    const rootInstanceId = selectedPage?.rootInstanceId;
    if (rootInstanceId !== undefined) {
      setDataCollapsed(rootInstanceId);
    }
  });

  useEffect(subscribeCollapsed, []);

  useHashLinkSync();

  useEffect(subscribeInterceptedEvents, []);

  const components = useStore($registeredComponents);
  const instances = useStore($instances);
  const elements = useElementsTree(components, instances);

  const [isInitialized, setInitialized] = useState(false);
  useEffect(() => {
    setInitialized(true);
  }, []);

  if (components.size === 0 || instances.size === 0) {
    return <Body />;
  }

  return (
    <>
      <GlobalStyles />
      {/* catch all errors in rendered components */}
      <ErrorBoundary FallbackComponent={FallbackComponent}>
        {elements}
      </ErrorBoundary>
      {
        // Call hooks after render to ensure effects are last.
        // Helps improve outline calculations as all styles are then applied.
      }
      {isDesignMode && isInitialized && <DesignMode />}
      {isContentMode && isInitialized && <ContentEditMode />}
    </>
  );
};
