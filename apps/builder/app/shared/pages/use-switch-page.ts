import { useEffect, useInsertionEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { useLocation, useNavigate, useNavigationType } from "@remix-run/react";
import { $instances, $pages, $project } from "~/shared/sync/data-stores";
import {
  $authToken,
  $canOpenPageTemplates,
  $selectedInstanceSelector,
  $selectedPageId,
  $selectedPageHash,
  $builderMode,
  $isPreviewMode,
  $pageNavigation,
  requestPageNavigation,
  isBuilderMode,
  selectInstance,
  setBuilderMode,
} from "~/shared/nano-states";
import { builderPath } from "~/shared/router-utils";
import { $selectedPage } from "../nano-states";
import { selectPage } from "../nano-states";
import { findPageByIdOrPath, isPageTemplate } from "@webstudio-is/sdk";
import {
  areInstanceSelectorsEqual,
  type InstanceSelector,
} from "@webstudio-is/project-build/runtime";
import { canResolveInstanceSelector } from "../instance-utils/selection";
import {
  getDeepLinkedInstanceSelection,
  getInstanceSelectorFromUrl,
} from "../instance-utils/link";

const shouldNavigateToPageState = ({
  isUrlStateInitialized,
  isSamePageState,
  searchParamsInstanceSelector,
  instanceSelector,
}: {
  isUrlStateInitialized: boolean;
  isSamePageState: boolean;
  searchParamsInstanceSelector: InstanceSelector | undefined;
  instanceSelector: InstanceSelector | undefined;
}) =>
  isUrlStateInitialized &&
  (isSamePageState === false ||
    (searchParamsInstanceSelector === undefined
      ? instanceSelector !== undefined
      : areInstanceSelectorsEqual(
          searchParamsInstanceSelector,
          instanceSelector
        ) === false));

export const __testing__ = {
  shouldNavigateToPageState,
};

const setPageStateFromUrl = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const pages = $pages.get();
  if (pages === undefined) {
    return false;
  }

  let mode = searchParams.get("mode");

  // Check in case of BuilderMode rename
  if (!isBuilderMode(mode)) {
    mode = null;
  }

  setBuilderMode(mode);

  // check the page actually exists
  // to avoid confusing the user with broken state
  const requestedPageId = searchParams.get("pageId") ?? "";
  const pageId =
    ($canOpenPageTemplates.get()
      ? findPageByIdOrPath(requestedPageId, pages, { includeTemplates: true })
      : findPageByIdOrPath(requestedPageId, pages)
    )?.id ?? pages.homePageId;

  requestPageNavigation({
    pageId,
    hash: searchParams.get("pageHash") ?? "",
    location: {
      key: window.history.state?.key ?? "default",
      type: "POP",
    },
  });
  const requestedInstanceSelector = getInstanceSelectorFromUrl(searchParams);
  const instanceSelection = getDeepLinkedInstanceSelection({
    instanceSelector: requestedInstanceSelector,
    canOpenPageTemplates: $canOpenPageTemplates.get(),
    pages,
    instances: $instances.get(),
  });
  if (instanceSelection !== undefined) {
    $selectedPageId.set(instanceSelection.pageId);
    selectInstance(instanceSelection.instanceSelector);
    return true;
  }
  selectPage(pageId);
  return true;
};

/**
 * Sync
 *  - searchParams to atoms
 *    - initial loading
 *    - popstate
 *
 *  - atoms to searchParams
 *    - on atom change
 */
const useSyncPageStateToUrl = (
  isUrlStateInitialized: boolean,
  key?: string,
  type?: ReturnType<typeof useNavigationType>
) => {
  const navigate = useNavigate();
  const pending = useRef<{ id: string; key: string }>();
  const page = useStore($selectedPage);
  const pageHash = useStore($selectedPageHash);
  const builderMode = useStore($builderMode);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);

  useEffect(() => {
    const location = key && type ? { key, type } : undefined;
    if ($isPreviewMode.get() && location === undefined) {
      return;
    }
    // POP can update stores after this render. Never write a stale render back
    // over the browser's restored URL.
    const page = $selectedPage.get();
    const pageHash = $selectedPageHash.get();
    const builderMode = $builderMode.get();
    const selectedInstanceSelector = $selectedInstanceSelector.get();
    const project = $project.get();
    const pages = $pages.get();

    if (page === undefined || project === undefined || pages === undefined) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    const searchParamsPageId = searchParams.get("pageId") ?? pages.homePageId;
    const searchParamsPageHash = searchParams.get("pageHash") ?? "";
    const searchParamsInstanceSelector =
      getInstanceSelectorFromUrl(searchParams);
    const searchParamsModeRaw = searchParams.get("mode");
    const searchParamsMode = isBuilderMode(searchParamsModeRaw)
      ? searchParamsModeRaw
      : undefined;
    const builderModeParam = builderMode === "design" ? undefined : builderMode;
    const searchParamsSafemode = searchParams.get("safemode");
    const instanceSelector =
      selectedInstanceSelector === undefined ||
      selectedInstanceSelector[0] === page.rootInstanceId ||
      canResolveInstanceSelector(selectedInstanceSelector, $instances.get()) ===
        false
        ? undefined
        : selectedInstanceSelector;

    const isSamePageState =
      searchParamsPageId === page.id &&
      searchParamsPageHash === pageHash.hash &&
      searchParamsMode === builderModeParam;

    const request = $pageNavigation.get();
    const committedKey = request?.location?.key ?? pending.current?.key;
    // Router can render before the POP reader, or a store update can render
    // before Router. Only synchronize a matching committed location.
    if (
      location &&
      (location.key !== (window.history.state?.key ?? "default") ||
        (location.type === "POP" &&
          committedKey !== undefined &&
          committedKey !== location.key))
    ) {
      return;
    }
    if (request?.location) {
      pending.current = undefined;
    }
    const isRequest =
      location !== undefined && request !== undefined && !request.location;
    if (isRequest) {
      if (request.pageId !== page.id || request.hash !== pageHash.hash) {
        return;
      }
      if (pending.current) {
        if (pending.current.key === location.key) {
          return;
        }
        const completedId = pending.current.id;
        pending.current = undefined;
        if (isSamePageState && completedId === request.id) {
          $pageNavigation.set({ ...request, location });
          return;
        }
      }
      pending.current = { id: request.id, key: location.key };
    }

    // Do not navigate before initial URL state is applied, on popstate change,
    // or if params match.
    if (
      !isRequest &&
      shouldNavigateToPageState({
        isUrlStateInitialized,
        isSamePageState,
        searchParamsInstanceSelector,
        instanceSelector,
      }) === false
    ) {
      if (
        location &&
        isUrlStateInitialized &&
        isSamePageState &&
        request?.location?.key !== location.key
      ) {
        if (request?.pageId === page.id && request.hash === pageHash.hash) {
          $pageNavigation.set({ ...request, location });
        } else {
          requestPageNavigation({
            pageId: page.id,
            hash: pageHash.hash,
            location,
          });
        }
      }
      return;
    }

    navigate(
      builderPath({
        pageId: page.id === pages.homePageId ? undefined : page.id,
        instanceSelector,
        authToken: $authToken.get(),
        pageHash: pageHash.hash === "" ? undefined : pageHash.hash,
        mode: builderModeParam,
        safemode: searchParamsSafemode === "true",
      }),
      { replace: isSamePageState }
    );
  }, [
    builderMode,
    isUrlStateInitialized,
    key,
    type,
    navigate,
    page,
    pageHash,
    selectedInstanceSelector,
  ]);
  return page;
};

// Mount only in Preview: Router key changes must not subscribe the Design UI.
export const PreviewNavigationObserver = () => {
  const location = useLocation();
  const type = useNavigationType();
  useEffect(
    () => () => {
      if (!$isPreviewMode.get()) {
        $pageNavigation.set(undefined);
      }
    },
    []
  );
  useSyncPageStateToUrl(true, location.key, type);
  return null;
};

export const useSyncPageUrl = ({ isDataLoaded }: { isDataLoaded: boolean }) => {
  const [isUrlStateInitialized, setIsUrlStateInitialized] = useState(false);
  const page = useSyncPageStateToUrl(isUrlStateInitialized);
  const canOpenPageTemplate = useStore($canOpenPageTemplates);

  // Apply initial URL state only after all synchronized data has loaded.
  useEffect(() => {
    if (isDataLoaded && !isUrlStateInitialized && setPageStateFromUrl()) {
      setIsUrlStateInitialized(true);
    }
  }, [isDataLoaded, isUrlStateInitialized]);

  useEffect(() => {
    window.addEventListener("popstate", setPageStateFromUrl, true);
    return () =>
      window.removeEventListener("popstate", setPageStateFromUrl, true);
  }, []);

  useEffect(() => {
    const pages = $pages.get();
    if (pages === undefined || page === undefined) {
      return;
    }
    if (isPageTemplate(page) && canOpenPageTemplate === false) {
      selectPage(pages.homePageId);
    }
  }, [canOpenPageTemplate, page]);

  useEffect(() => {
    return $selectedPage.subscribe((page) => {
      // switch to home page when current one does not exist
      // possible when undo creating page
      const pages = $pages.get();
      if (pages === undefined) {
        return;
      }
      if (page === undefined) {
        selectPage(pages.homePageId);
        return;
      }
      if (isPageTemplate(page) && $canOpenPageTemplates.get() === false) {
        selectPage(pages.homePageId);
      }
    });
  });
};

/**
 * Synchronize pageHash with scrolling position
 */
export const useHashLinkSync = (rootInstanceId: string | undefined) => {
  const pageHash = useStore($selectedPageHash);
  const navigation = useStore($pageNavigation);
  const isPreviewMode = useStore($isPreviewMode);
  const positions = useRef(new Map<string, [number, number]>());
  const entry = useRef<{
    request: string | typeof pageHash;
    hashRequest: typeof pageHash;
    preview: boolean;
    root: string;
    element?: Element;
    key?: string;
    scroll?: () => boolean;
    observer?: MutationObserver;
  }>();

  useEffect(() => {
    const save = () => {
      const current = entry.current;
      if (current?.key && current.element?.isConnected) {
        positions.current.set(current.key, [scrollX, scrollY]);
      }
    };
    const freeze = () => {
      save();
      if (entry.current) {
        entry.current.key = undefined;
        entry.current.observer?.disconnect();
        entry.current.observer = undefined;
        entry.current.scroll = undefined;
      }
    };
    const stopNavigation = $pageNavigation.listen((next, previous) => {
      if (next?.id !== previous?.id) {
        freeze();
      }
    });
    const stopMode = $isPreviewMode.listen((preview) => {
      if (!preview) {
        freeze();
        if (entry.current) {
          entry.current.preview = false;
        }
      }
    });
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      window.removeEventListener("scroll", save);
      stopNavigation();
      stopMode();
      entry.current?.observer?.disconnect();
    };
  }, []);

  // Also runs when inflation inserts a new root, before child animation effects.
  useInsertionEffect(() => {
    if (
      rootInstanceId === undefined ||
      (!isPreviewMode &&
        entry.current?.hashRequest === pageHash &&
        entry.current.root === rootInstanceId) ||
      (isPreviewMode &&
        navigation &&
        navigation.pageId !== $selectedPage.get()?.id)
    ) {
      return;
    }
    const request = isPreviewMode && navigation ? navigation.id : pageHash;
    const location = isPreviewMode ? navigation?.location : undefined;
    const hash = isPreviewMode && navigation ? navigation.hash : pageHash.hash;
    if (
      entry.current?.request !== request ||
      entry.current.preview !== isPreviewMode ||
      entry.current.root !== rootInstanceId
    ) {
      entry.current?.observer?.disconnect();
      const position = location
        ? positions.current.get(location.key)
        : undefined;
      const current: NonNullable<typeof entry.current> = {
        request,
        hashRequest: pageHash,
        preview: isPreviewMode,
        root: rootInstanceId,
        scroll: () => {
          const pageRoot = document.querySelector(
            `[data-ws-id="${CSS.escape(rootInstanceId)}"]`
          );
          if (!pageRoot) {
            return false;
          }
          current.element = pageRoot;
          if (position || (isPreviewMode && hash === "")) {
            const [left, top] = position ?? [0, 0];
            window.scrollTo({ left, top, behavior: "instant" });
          } else if (hash !== "") {
            const elementId = hash.startsWith("#") ? hash.slice(1) : hash;
            const element = document.getElementById(
              decodeURIComponent(elementId)
            );
            if (!element || !pageRoot.contains(element)) {
              return false;
            }
            element.scrollIntoView();
          }
          return true;
        },
      };
      entry.current = current;
    }
    const current = entry.current;
    if (location && current.key !== location.key) {
      if (location.type === "REPLACE" && current.key) {
        positions.current.delete(current.key);
      }
      current.key = location.key;
    }
    const apply = () => {
      if (current.scroll?.()) {
        current.scroll = undefined;
        current.observer?.disconnect();
      }
      if (current.key && !current.scroll) {
        positions.current.set(current.key, [scrollX, scrollY]);
      }
    };
    apply();
    if (current.scroll && !current.observer) {
      current.observer = new MutationObserver(apply);
      current.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["id"],
      });
    }
  });
};
