import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { useNavigate } from "@remix-run/react";
import { $instances, $pages, $project } from "~/shared/sync/data-stores";
import {
  $authToken,
  $canOpenPageTemplates,
  $selectedInstanceSelector,
  $selectedPageId,
  $selectedPageHash,
  $builderMode,
  isBuilderMode,
  selectInstance,
  setBuilderMode,
} from "~/shared/nano-states";
import { builderPath } from "~/shared/router-utils";
import { $selectedPage } from "../nano-states";
import { selectPage } from "../nano-states";
import {
  findPageByIdOrPath,
  getAllPages,
  isPageTemplate,
  type Instances,
  type Pages,
} from "@webstudio-is/sdk";
import {
  areInstanceSelectorsEqual,
  type InstanceSelector,
} from "@webstudio-is/project-build/runtime";
import { canResolveInstanceSelector } from "../instance-utils/selection";

const getDeepLinkedInstanceSelection = ({
  instanceSelector,
  canOpenPageTemplates,
  pages,
  instances,
}: {
  instanceSelector: InstanceSelector | undefined;
  canOpenPageTemplates: boolean;
  pages: Pages;
  instances: Instances;
}) => {
  if (instanceSelector === undefined) {
    return;
  }

  const instanceId = instanceSelector[0];
  if (
    instanceId === undefined ||
    instances.has(instanceId) === false ||
    canResolveInstanceSelector(instanceSelector, instances) === false
  ) {
    return;
  }

  const rootInstanceId = instanceSelector.at(-1);
  const page = getAllPages(pages).find(
    (page) => page.rootInstanceId === rootInstanceId
  );
  if (
    page === undefined ||
    (isPageTemplate(page) && canOpenPageTemplates === false)
  ) {
    return;
  }
  return { pageId: page.id, instanceSelector };
};

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

const shouldInitializePageState = ({
  isDataLoaded,
  isUrlStateInitialized,
}: {
  isDataLoaded: boolean;
  isUrlStateInitialized: boolean;
}) => isDataLoaded && isUrlStateInitialized === false;

export const __testing__ = {
  getDeepLinkedInstanceSelection,
  shouldInitializePageState,
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

  $selectedPageHash.set({ hash: searchParams.get("pageHash") ?? "" });
  const requestedInstanceSelector = searchParams.getAll("instanceSelector");
  const instanceSelection = getDeepLinkedInstanceSelection({
    instanceSelector:
      requestedInstanceSelector.length === 0
        ? undefined
        : requestedInstanceSelector,
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
export const useSyncPageUrl = ({ isDataLoaded }: { isDataLoaded: boolean }) => {
  const navigate = useNavigate();
  const [isUrlStateInitialized, setIsUrlStateInitialized] = useState(false);
  const page = useStore($selectedPage);
  const pageHash = useStore($selectedPageHash);
  const builderMode = useStore($builderMode);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const canOpenPageTemplate = useStore($canOpenPageTemplates);

  // Apply initial URL state only after the sync client has finished loading.
  // Individual stores can contain intermediate data before then.
  useEffect(() => {
    if (
      shouldInitializePageState({
        isDataLoaded,
        isUrlStateInitialized,
      }) &&
      setPageStateFromUrl()
    ) {
      setIsUrlStateInitialized(true);
    }
  }, [isDataLoaded, isUrlStateInitialized]);

  useEffect(() => {
    window.addEventListener("popstate", setPageStateFromUrl);
    return () => {
      window.removeEventListener("popstate", setPageStateFromUrl);
    };
  }, []);

  useEffect(() => {
    const project = $project.get();
    const pages = $pages.get();

    if (page === undefined || project === undefined || pages === undefined) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    const searchParamsPageId = searchParams.get("pageId") ?? pages.homePageId;
    const searchParamsPageHash = searchParams.get("pageHash") ?? "";
    const searchParamsInstanceSelector =
      searchParams.getAll("instanceSelector");
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

    // Do not navigate before initial URL state is applied, on popstate change,
    // or if params match.
    if (
      shouldNavigateToPageState({
        isUrlStateInitialized,
        isSamePageState,
        searchParamsInstanceSelector:
          searchParamsInstanceSelector.length === 0
            ? undefined
            : searchParamsInstanceSelector,
        instanceSelector,
      }) === false
    ) {
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
    navigate,
    page,
    pageHash,
    selectedInstanceSelector,
  ]);

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
export const useHashLinkSync = () => {
  const pageHash = useStore($selectedPageHash);

  useEffect(() => {
    if (pageHash.hash === "") {
      // native browser behavior is to do nothing if hash is empty
      // remix scroll to top, we emulate native
      return;
    }

    let elementId = decodeURIComponent(pageHash.hash);
    if (elementId.startsWith("#")) {
      elementId = elementId.slice(1);
    }

    // Try find element to scroll to
    const element = document.getElementById(elementId);
    if (element !== null) {
      element.scrollIntoView();
    }

    // Remix scroll to top if element not found
    // browser do nothing
  }, [pageHash]);
};
