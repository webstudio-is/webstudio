import { findPageByIdOrPath } from "@webstudio-is/project-build";
import { isPreviewModeStore, pagesStore } from "~/shared/nano-states";
import { switchPage } from "~/shared/pages";

const isAbsoluteUrl = (href: string) => {
  try {
    new URL(href);
    return true;
  } catch {
    return false;
  }
};

const handleLinkClick = (element: HTMLAnchorElement) => {
  const pages = pagesStore.get();
  const href = element.getAttribute("href");
  if (href === null || pages === undefined) {
    return;
  }

  if (isAbsoluteUrl(href)) {
    window.open(href, "_blank");
    return;
  }

  const pageHref = new URL(href, "https://any-valid.url");
  const page = findPageByIdOrPath(pages, pageHref.pathname);
  if (page) {
    switchPage(page.id, pageHref.hash);
    return;
  }
};

export const subscribeInterceptedEvents = () => {
  const handleClick = (event: MouseEvent) => {
    if (event.target instanceof HTMLElement) {
      const a = event.target.closest("a");
      if (a) {
        event.preventDefault();
        if (isPreviewModeStore.get()) {
          handleLinkClick(a);
        }
      }
    }
  };
  const handleSubmit = (event: SubmitEvent) => {
    // prevent submitting the form when clicking a button type submit
    event.preventDefault();
  };
  const handleKeydown = (event: KeyboardEvent) => {
    if (isPreviewModeStore.get()) {
      return;
    }
    // prevent typing in inputs only in canvas mode
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      event.preventDefault();
    }
  };
  document.documentElement.addEventListener("click", handleClick);
  // preventDefault in form submit event does not work inside dialog
  // in bubble mode, capture solves the issue
  document.documentElement.addEventListener("submit", handleSubmit, {
    capture: true,
  });
  document.documentElement.addEventListener("keydown", handleKeydown);
  return () => {
    document.documentElement.removeEventListener("click", handleClick);
    document.documentElement.removeEventListener("submit", handleSubmit, {
      capture: true,
    });
    document.documentElement.removeEventListener("keydown", handleKeydown);
  };
};
