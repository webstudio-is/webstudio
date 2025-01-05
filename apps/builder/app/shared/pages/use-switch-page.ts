import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { useNavigate } from "@remix-run/react";
import {
  $authToken,
  $pages,
  $project,
  $selectedPageHash,
  $builderMode,
  isBuilderMode,
  setBuilderMode,
} from "~/shared/nano-states";
import { builderPath } from "~/shared/router-utils";
import { $selectedPage, selectPage } from "../awareness";
import { findPageByIdOrPath } from "@webstudio-is/sdk";

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
  const pageId =
    findPageByIdOrPath(searchParams.get("pageId") ?? "", pages)?.id ??
    pages.homePage.id;

  $selectedPageHash.set({ hash: searchParams.get("pageHash") ?? "" });
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

    const searchParamsPageId = searchParams.get("pageId") ?? pages.homePage.id;
    const searchParamsPageHash = searchParams.get("pageHash") ?? "";
    const searParamsModeRaw = searchParams.get("mode");
    const searParamsMode = isBuilderMode(searParamsModeRaw)
      ? searParamsModeRaw
      : undefined;

    // Do not navigate on popstate change
    if (
      searchParamsPageId === page.id &&
      searchParamsPageHash === pageHash.hash &&
      searParamsMode === builderMode
    ) {
      return;
    }

    navigate(
      builderPath({
        pageId: page.id === pages.homePage.id ? undefined : page.id,
        authToken: $authToken.get(),
        pageHash: pageHash.hash === "" ? undefined : pageHash.hash,
        mode: builderMode === "design" ? undefined : builderMode,
      })
    );
  }, [builderMode, navigate, page, pageHash]);
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
