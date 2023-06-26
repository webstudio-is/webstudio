import type { MouseEvent } from "react";
import { findPageByIdOrPath } from "@webstudio-is/project-build";
import { pagesStore, isPreviewModeStore } from "~/shared/nano-states";
import { switchPage } from "~/shared/pages";

const isAbsoluteUrl = (href: string) => {
  try {
    new URL(href);
    return true;
  } catch {
    return false;
  }
};

export const handleLinkClick = (event: MouseEvent) => {
  const pages = pagesStore.get();

  if (isPreviewModeStore.get() === false || pages === undefined) {
    return;
  }

  const href = event.currentTarget.getAttribute("href");

  if (href === null) {
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
