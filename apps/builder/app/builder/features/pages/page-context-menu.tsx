import { useState, type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@webstudio-is/design-system";
import { duplicatePage, duplicateFolder } from "./page-utils";

type PageContextMenuProps = {
  children: ReactNode;
  onRequestDeletePage: (pageId: string) => void;
  onRequestDeleteFolder: (folderId: string) => void;
};

export const PageContextMenu = ({
  children,
  onRequestDeletePage,
  onRequestDeleteFolder,
}: PageContextMenuProps) => {
  const [pageId, setPageId] = useState<string | undefined>();
  const [folderId, setFolderId] = useState<string | undefined>();

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
