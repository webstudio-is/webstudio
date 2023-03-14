import type { MouseEvent } from "react";
import { findPageByIdOrPath, Page } from "@webstudio-is/project-build";
import { pagesStore, isPreviewModeStore } from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    switchPage: { pageId: Page["id"] };
  }
}

const isAbsoluteUrl = (href: string) => {
  try {
    new URL(href);
    return true;
  } catch {
    return false;
  }
};

export const handleLinkClick = (event: MouseEvent) => {
  event.preventDefault();

  const pages = pagesStore.get();

  if (isPreviewModeStore.get() === false || pages === undefined) {
    return;
  }

  const href = event.currentTarget.getAttribute("href");

  if (href === null) {
    return;
  }

  const page = findPageByIdOrPath(pages, href);

  if (page) {
    publish({ type: "switchPage", payload: { pageId: page.id } });
    return;
  }

  if (isAbsoluteUrl(href)) {
    window.open(href, "_blank");
  }
};
