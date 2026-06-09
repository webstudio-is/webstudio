import { useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { findParentFolderByChildId } from "@webstudio-is/sdk";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@webstudio-is/design-system";
import {
  duplicateFolder,
  duplicatePage,
  duplicateTemplate,
} from "./page-utils";
import { selectPage } from "~/shared/nano-states";
import {
  copyFolder,
  copyPage,
  copyTemplate,
  pastePage,
} from "~/shared/copy-paste/copy-paste";
import { $pages } from "~/shared/sync/data-stores";
import { PageItemContextMenuActions } from "./page-item-actions";

type PageContextMenuProps = {
  children: ReactNode;
  canManagePages: boolean;
  onRequestDeletePage: (pageId: string) => void;
  onRequestDeleteFolder: (folderId: string) => void;
};

type PageMenuTarget =
  | { type: "page"; id: string }
  | { type: "folder"; id: string };

export const PageContextMenu = ({
  children,
  canManagePages,
  onRequestDeletePage,
  onRequestDeleteFolder,
}: PageContextMenuProps) => {
  const [target, setTarget] = useState<PageMenuTarget>();

  if (canManagePages === false) {
    return <>{children}</>;
  }

  const handleDuplicate = () => {
    if (target?.type === "page") {
      duplicatePage(target.id);
    } else if (target?.type === "folder") {
      duplicateFolder(target.id);
    }
  };

  const handleCopy = () => {
    if (target?.type === "page") {
      void copyPage(target.id);
    } else if (target?.type === "folder") {
      void copyFolder(target.id);
    }
  };

  const getPasteTargetFolderId = () => {
    const pages = $pages.get();
    if (pages === undefined) {
      return;
    }
    if (target?.type === "folder") {
      return target.id;
    }
    if (target?.type === "page") {
      return (
        findParentFolderByChildId(target.id, pages.folders)?.id ??
        pages.rootFolderId
      );
    }
    return pages.rootFolderId;
  };

  return (
    <>
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) {
            setTarget(undefined);
          }
        }}
      >
        <ContextMenuTrigger
          asChild
          onPointerDown={(event) => {
            if (!(event.target instanceof HTMLElement)) {
              return;
            }
            const button =
              event.target.closest<HTMLElement>("[data-tree-button]");
            const pageId = button?.getAttribute("data-page-id");
            const folderId = button?.getAttribute("data-folder-id");
            flushSync(() => {
              if (pageId) {
                setTarget({ type: "page", id: pageId });
              } else if (folderId) {
                setTarget({ type: "folder", id: folderId });
              } else {
                setTarget(undefined);
              }
            });
          }}
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <PageItemContextMenuActions
            actions={{
              paste: () => {
                void pastePage(getPasteTargetFolderId());
              },
              copy: target ? handleCopy : undefined,
              duplicate: target ? handleDuplicate : undefined,
              delete: target
                ? () => {
                    if (target.type === "page") {
                      onRequestDeletePage(target.id);
                    } else {
                      onRequestDeleteFolder(target.id);
                    }
                  }
                : undefined,
            }}
          />
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
};

type TemplateContextMenuProps = {
  children: ReactNode;
  canManageTemplates: boolean;
  onRequestDeleteTemplate: (templateId: string) => void;
};

export const TemplateContextMenu = ({
  children,
  canManageTemplates,
  onRequestDeleteTemplate,
}: TemplateContextMenuProps) => {
  const [templateId, setTemplateId] = useState<string | undefined>();

  if (canManageTemplates === false) {
    return <>{children}</>;
  }

  const handleDuplicate = () => {
    if (templateId) {
      const newTemplateId = duplicateTemplate(templateId);
      if (newTemplateId) {
        selectPage(newTemplateId);
      }
    }
  };

  const handleCopy = () => {
    if (templateId) {
      void copyTemplate(templateId);
    }
  };

  return (
    <>
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) {
            setTemplateId(undefined);
          }
        }}
      >
        <ContextMenuTrigger
          asChild
          onPointerDown={(event) => {
            if (!(event.target instanceof HTMLElement)) {
              return;
            }
            const button =
              event.target.closest<HTMLElement>("[data-tree-button]");
            const templateId = button?.getAttribute("data-template-id");
            flushSync(() => {
              if (templateId) {
                setTemplateId(templateId);
              } else {
                setTemplateId(undefined);
              }
            });
          }}
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <PageItemContextMenuActions
            actions={{
              copy: templateId ? handleCopy : undefined,
              duplicate: templateId ? handleDuplicate : undefined,
              delete: templateId
                ? () => {
                    onRequestDeleteTemplate(templateId);
                  }
                : undefined,
            }}
          />
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
};
