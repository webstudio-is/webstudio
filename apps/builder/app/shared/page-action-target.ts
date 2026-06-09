import { findPageByIdOrPath } from "@webstudio-is/sdk";
import {
  $editingPageId,
  $editingTemplateId,
  $selectedInstancePath,
  $selectedPageId,
} from "./nano-states";
import { $pages } from "./sync/data-stores";

export type PageActionTarget =
  | { type: "page"; id: string }
  | { type: "folder"; id: string }
  | { type: "template"; id: string };

export const getPageActionTarget = (): PageActionTarget | undefined => {
  const pages = $pages.get();
  if (pages === undefined) {
    return;
  }

  const editingPageId = $editingPageId.get();
  if (editingPageId) {
    if (pages.pages.has(editingPageId)) {
      return { type: "page", id: editingPageId };
    }
    if (pages.folders.has(editingPageId)) {
      return { type: "folder", id: editingPageId };
    }
  }

  const editingTemplateId = $editingTemplateId.get();
  if (editingTemplateId && pages.pageTemplates?.has(editingTemplateId)) {
    return { type: "template", id: editingTemplateId };
  }

  const selectedPageId = $selectedPageId.get();
  const selectedInstancePath = $selectedInstancePath.get();
  if (
    selectedPageId === undefined ||
    selectedInstancePath === undefined ||
    selectedInstancePath.length !== 1
  ) {
    return;
  }
  const selectedPage = findPageByIdOrPath(selectedPageId, pages, {
    includeTemplates: true,
  });
  if (
    selectedPage === undefined ||
    selectedPage.rootInstanceId !== selectedInstancePath[0].instance.id
  ) {
    return;
  }
  if (pages.pageTemplates?.has(selectedPage.id)) {
    return { type: "template", id: selectedPage.id };
  }
  if (pages.pages.has(selectedPage.id)) {
    return { type: "page", id: selectedPage.id };
  }
};

export const getDeletablePageActionTarget = () => {
  const pages = $pages.get();
  const target = getPageActionTarget();
  if (pages === undefined || target === undefined) {
    return;
  }
  if (target.type === "page" && target.id === pages.homePageId) {
    return;
  }
  return target;
};
