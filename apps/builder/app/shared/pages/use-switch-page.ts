import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { useNavigate } from "@remix-run/react";
import type { Page } from "@webstudio-is/sdk";
import { findPageByIdOrPath } from "@webstudio-is/project-build";
import { useMount } from "~/shared/hook-utils/use-mount";
import {
  $authToken,
  pagesStore,
  projectStore,
  selectedPageStore,
  selectedPageIdStore,
  selectedPageHashStore,
  selectedInstanceSelectorStore,
  $isPreviewMode,
} from "~/shared/nano-states";
import { builderPath } from "~/shared/router-utils";

export const switchPage = (pageId?: Page["id"], pageHash?: string) => {
  const pages = pagesStore.get();

  if (pages === undefined) {
    return;
  }

  const page = findPageByIdOrPath(pages, pageId ?? "");

  selectedPageHashStore.set(pageHash ?? "");
  selectedPageIdStore.set(page?.id ?? pages.homePage.id);
  selectedInstanceSelectorStore.set([
    page?.rootInstanceId ?? pages.homePage.rootInstanceId,
  ]);
};

const setPageStateFromUrl = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const pages = pagesStore.get();

  const pageId = searchParams.get("pageId") ?? pages?.homePage.id;
  const pageHash = searchParams.get("pageHash") ?? "";

  $isPreviewMode.set(searchParams.get("mode") === "preview");

  switchPage(pageId, pageHash);
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
  const page = useStore(selectedPageStore);
  const pageHash = useStore(selectedPageHashStore);
  const isPreviewMode = useStore($isPreviewMode);

  // Get pageId and pageHash from URL
  useMount(() => {
    setPageStateFromUrl();
  });

  useEffect(() => {
    window.addEventListener("popstate", setPageStateFromUrl);
    return () => {
      window.removeEventListener("popstate", setPageStateFromUrl);
    };
  }, []);

  useEffect(() => {
    const project = projectStore.get();
    const pages = pagesStore.get();

    if (page === undefined || project === undefined || pages === undefined) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    const searchParamsPageId = searchParams.get("pageId") ?? pages.homePage.id;
    const searchParamsPageHash = searchParams.get("pageHash") ?? "";
    const searchParamsIsPreviewMode = searchParams.get("mode") === "preview";

    // Do not navigate on popstate change
    if (
      searchParamsPageId === page.id &&
      searchParamsPageHash === pageHash &&
      searchParamsIsPreviewMode === isPreviewMode
    ) {
      return;
    }

    navigate(
      builderPath({
        projectId: project.id,
        pageId: page.id === pages.homePage.id ? undefined : page.id,
        authToken: $authToken.get(),
        pageHash: pageHash === "" ? undefined : pageHash,
        mode: isPreviewMode ? "preview" : undefined,
      })
    );
  }, [isPreviewMode, navigate, page, pageHash]);
};

/**
 * Synchronize pageHash with scrolling position
 */
export const useHashLinkSync = () => {
  const pageHash = useStore(selectedPageHashStore);

  useEffect(() => {
    if (pageHash === "") {
      // native browser behavior is to do nothing if hash is empty
      // remix scroll to top, we emulate native
      return;
    }

    let elementId = decodeURIComponent(pageHash);
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
