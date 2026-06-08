import { useState, type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@webstudio-is/design-system";
import {
  duplicatePage,
  duplicateFolder,
  duplicateTemplate,
} from "./page-utils";
import { selectPage } from "~/shared/nano-states";

type PageContextMenuProps = {
  children: ReactNode;
  canManagePages: boolean;
  onRequestDeletePage: (pageId: string) => void;
  onRequestDeleteFolder: (folderId: string) => void;
};

export const PageContextMenu = ({
  children,
  canManagePages,
  onRequestDeletePage,
  onRequestDeleteFolder,
}: PageContextMenuProps) => {
  const [pageId, setPageId] = useState<string | undefined>();
  const [folderId, setFolderId] = useState<string | undefined>();

  if (canManagePages === false) {
    return <>{children}</>;
  }

  const handleDuplicate = () => {
    if (pageId) {
      duplicatePage(pageId);
    } else if (folderId) {
      duplicateFolder(folderId);
    }
  };

  return (
    <>
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) {
            setPageId(undefined);
            setFolderId(undefined);
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
            if (pageId) {
              setPageId(pageId);
              setFolderId(undefined);
            } else if (folderId) {
              setFolderId(folderId);
              setPageId(undefined);
            }
          }}
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={handleDuplicate}
            disabled={!pageId && !folderId}
          >
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              if (pageId) {
                onRequestDeletePage(pageId);
              } else if (folderId) {
                onRequestDeleteFolder(folderId);
              }
            }}
            destructive
            disabled={!pageId && !folderId}
          >
            Delete
          </ContextMenuItem>
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
            if (templateId) {
              setTemplateId(templateId);
            }
          }}
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={handleDuplicate} disabled={!templateId}>
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              if (templateId) {
                onRequestDeleteTemplate(templateId);
              }
            }}
            destructive
            disabled={!templateId}
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
};
