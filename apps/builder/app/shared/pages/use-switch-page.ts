import { useEffect } from "react";
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
  isPageTemplate,
  type Instances,
  type Pages,
} from "@webstudio-is/sdk";
import { findPageAndSelectorByInstanceId } from "@webstudio-is/project-build/runtime";

const getDeepLinkedInstanceSelection = ({
  instanceId,
  canOpenPageTemplates,
  pages,
  instances,
}: {
  instanceId: string | null;
  canOpenPageTemplates: boolean;
  pages: Pages;
  instances: Instances;
}) => {
  if (instanceId === null || instances.has(instanceId) === false) {
    return;
  }

  const selection = findPageAndSelectorByInstanceId(
    pages,
    instances,
    instanceId
  );
  const page = canOpenPageTemplates
    ? findPageByIdOrPath(selection.pageId, pages, { includeTemplates: true })
    : findPageByIdOrPath(selection.pageId, pages);
  if (page?.rootInstanceId !== selection.instanceSelector.at(-1)) {
    return;
  }
  return selection;
};

export const __testing__ = { getDeepLinkedInstanceSelection };

const setPageStateFromUrl = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const pages = $pages.get();
  if (pages === undefined) {
    return;
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
  const instanceSelection = getDeepLinkedInstanceSelection({
    instanceId: searchParams.get("instanceId"),
    canOpenPageTemplates: $canOpenPageTemplates.get(),
    pages,
    instances: $instances.get(),
  });
  if (instanceSelection !== undefined) {
    $selectedPageId.set(instanceSelection.pageId);
    selectInstance(instanceSelection.instanceSelector);
    return;
  }
  selectPage(pageId);
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
export const useSyncPageUrl = () => {
  const navigate = useNavigate();
  const page = useStore($selectedPage);
  const pageHash = useStore($selectedPageHash);
  const builderMode = useStore($builderMode);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const canOpenPageTemplate = useStore($canOpenPageTemplates);

  // Get pageId and pageHash from URL
  // once pages are loaded
  useEffect(() => {
    const unsubscribe = $pages.subscribe((pages) => {
      if (pages) {
        unsubscribe();
        setPageStateFromUrl();
      }
    });
    return unsubscribe;
  }, []);

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
    const searchParamsInstanceId = searchParams.get("instanceId") ?? undefined;
    const searchParamsModeRaw = searchParams.get("mode");
    const searchParamsMode = isBuilderMode(searchParamsModeRaw)
      ? searchParamsModeRaw
      : undefined;
    const builderModeParam = builderMode === "design" ? undefined : builderMode;
    const searchParamsSafemode = searchParams.get("safemode");
    const selectedInstanceId = selectedInstanceSelector?.[0];
    const instanceId =
      selectedInstanceId === page.rootInstanceId ||
      $instances.get().has(selectedInstanceId ?? "") === false
        ? undefined
        : selectedInstanceId;

    const isSamePageState =
      searchParamsPageId === page.id &&
      searchParamsPageHash === pageHash.hash &&
      searchParamsMode === builderModeParam;

    // Do not navigate on popstate change or if params match
    if (isSamePageState && searchParamsInstanceId === instanceId) {
      return;
    }

    navigate(
      builderPath({
        pageId: page.id === pages.homePageId ? undefined : page.id,
        instanceId,
        authToken: $authToken.get(),
        pageHash: pageHash.hash === "" ? undefined : pageHash.hash,
        mode: builderModeParam,
        safemode: searchParamsSafemode === "true",
      }),
      { replace: isSamePageState }
    );
  }, [builderMode, navigate, page, pageHash, selectedInstanceSelector]);

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
