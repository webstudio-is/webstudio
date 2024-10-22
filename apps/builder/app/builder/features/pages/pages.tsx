import { useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import {
  Tooltip,
  Box,
  Button,
  SmallIconButton,
  TreeNode,
  TreeRoot,
  TreeNodeLabel,
  PanelTitle,
  Separator,
} from "@webstudio-is/design-system";
import {
  ChevronRightIcon,
  FolderIcon,
  HomeIcon,
  EllipsesIcon,
  NewFolderIcon,
  NewPageIcon,
  PageIcon,
  DynamicPageIcon,
  CrossIcon,
} from "@webstudio-is/icons";
import { ExtendedPanel } from "../../shared/extended-sidebar-panel";
import { NewPageSettings, PageSettings } from "./page-settings";
import { $editingPageId, $pages, $selectedPageId } from "~/shared/nano-states";
import { switchPage } from "~/shared/pages";
import { getAllChildrenAndSelf, reparentOrphansMutable } from "./page-utils";
import {
  FolderSettings,
  NewFolderSettings,
  newFolderId,
} from "./folder-settings";
import { serverSyncStore } from "~/shared/sync";
import { useMount } from "~/shared/hook-utils/use-mount";
import { ROOT_FOLDER_ID, type Folder, type Page } from "@webstudio-is/sdk";
import { atom, computed } from "nanostores";
import { isPathnamePattern } from "~/builder/shared/url-pattern";

const ItemSuffix = ({
  isParentSelected,
  itemId,
  editingItemId,
  onEdit,
  type,
}: {
  isParentSelected: boolean;
  itemId: string;
  editingItemId: string | undefined;
  onEdit: (itemId: string | undefined) => void;
  type: "folder" | "page";
}) => {
  const isEditing = editingItemId === itemId;

  const menuLabel =
    type === "page"
      ? isEditing
        ? "Close page settings"
        : "Open page settings"
      : isEditing
        ? "Close folder settings"
        : "Open folder settings";

  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const prevEditingItemId = useRef(editingItemId);
  useEffect(() => {
    // when settings panel close, move focus back to the menu button
    if (
      editingItemId === undefined &&
      prevEditingItemId.current === itemId &&
      buttonRef.current
    ) {
      buttonRef.current.focus();
    }
    prevEditingItemId.current = editingItemId;
  }, [editingItemId, itemId]);

  return (
    <Tooltip content={menuLabel} disableHoverableContent>
      <SmallIconButton
        tabIndex={-1}
        aria-label={menuLabel}
        state={isParentSelected ? "open" : undefined}
        onClick={() => onEdit(isEditing ? undefined : itemId)}
        ref={buttonRef}
        // forces to highlight tree node and show action
        aria-current={isEditing}
        icon={isEditing ? <ChevronRightIcon /> : <EllipsesIcon />}
      />
    </Tooltip>
  );
};

const useReparentOrphans = () => {
  useMount(() => {
    // Pages may not be loaded yet when switching betwen projects and the pages
    // panel was already visible - it mounts faster than we load the pages.
    if ($pages.get() === undefined) {
      return;
    }
    serverSyncStore.createTransaction([$pages], (pages) => {
      if (pages === undefined) {
        return;
      }
      reparentOrphansMutable(pages);
    });
  });
};

const isFolder = (id: string, folders: Array<Folder>) => {
  return id === newFolderId || folders.some((folder) => folder.id === id);
};

// We want to keep the state when panel is closed and opened again.
const $expandedItems = atom(new Set<string>());

type PagesTreeItem =
  | {
      id: string;
      level: number;
      isExpanded?: boolean;
      type: "page";
      page: Page;
    }
  | {
      id: string;
      level: number;
      isExpanded?: boolean;
      type: "folder";
      folder: Folder;
    };

const $flatPagesTree = computed(
  [$pages, $expandedItems],
  (pagesData, expandedItems) => {
    const flatPagesTree: PagesTreeItem[] = [];
    if (pagesData === undefined) {
      return flatPagesTree;
    }
    const folders = new Map(
      pagesData.folders.map((folder) => [folder.id, folder])
    );
    const pages = new Map(pagesData.pages.map((page) => [page.id, page]));
    pages.set(pagesData.homePage.id, pagesData.homePage);
    const traverse = (itemId: string, level = 0) => {
      const folder = folders.get(itemId);
      const page = pages.get(itemId);
      if (folder) {
        let isExpanded: undefined | boolean;
        if (level > 0 && folder.children.length > 0) {
          isExpanded = expandedItems.has(folder.id);
        }
        // hide root folder
        if (itemId !== ROOT_FOLDER_ID) {
          flatPagesTree.push({
            id: itemId,
            level,
            isExpanded,
            type: "folder",
            folder,
          });
        }
        if (level === 0 || isExpanded) {
          for (const childId of folder.children) {
            traverse(childId, level + 1);
          }
        }
      }
      if (page) {
        flatPagesTree.push({ id: itemId, level, type: "page", page });
      }
    };
    traverse(ROOT_FOLDER_ID);
    return flatPagesTree;
  }
);

const PagesTree = ({
  onClose,
  onCreateNewFolder,
  onCreateNewPage,
  onSelect,
  selectedPageId,
  onEdit,
  editingItemId,
}: {
  onClose: () => void;
  onCreateNewFolder: () => void;
  onCreateNewPage: () => void;
  onSelect: (pageId: string) => void;
  selectedPageId: string;
  onEdit: (pageId: string | undefined) => void;
  editingItemId?: string;
}) => {
  const pages = useStore($pages);
  const flatPagesTree = useStore($flatPagesTree);
  useReparentOrphans();

  if (pages === undefined) {
    return null;
  }

  return (
    <>
      <PanelTitle
        suffix={
          <>
            <Tooltip content="New folder" side="bottom">
              <Button
                onClick={() => onCreateNewFolder()}
                aria-label="New folder"
                prefix={<NewFolderIcon />}
                color="ghost"
              />
            </Tooltip>
            <Tooltip content="New page" side="bottom">
              <Button
                onClick={() => onCreateNewPage()}
                aria-label="New page"
                prefix={<NewPageIcon />}
                color="ghost"
              />
            </Tooltip>
            <Tooltip content="Close panel" side="bottom">
              <Button
                color="ghost"
                prefix={<CrossIcon />}
                aria-label="Close panel"
                onClick={onClose}
              />
            </Tooltip>
          </>
        }
      >
        Pages
      </PanelTitle>
      <Separator />

      <Box css={{ overflowY: "auto", flexBasis: 0, flexGrow: 1 }}>
        <TreeRoot>
          {flatPagesTree.map((item, index) => {
            const handleExpand = (isExpanded: boolean, all: boolean) => {
              const expandedItems = new Set($expandedItems.get());
              const items = all
                ? getAllChildrenAndSelf(item.id, pages.folders, "folder")
                : [item.id];
              for (const itemId of items) {
                if (isExpanded) {
                  expandedItems.add(itemId);
                } else {
                  expandedItems.delete(itemId);
                }
              }
              $expandedItems.set(expandedItems);
            };

            return (
              <TreeNode
                key={item.id}
                level={item.level}
                tabbable={index === 0}
                isSelected={item.id === selectedPageId}
                isExpanded={item.isExpanded}
                onExpand={handleExpand}
                buttonProps={{
                  onClick: (event) => {
                    if (item.type === "folder") {
                      handleExpand(item.isExpanded === false, event.altKey);
                    }
                    if (item.type === "page") {
                      onSelect(item.id);
                    }
                  },
                }}
                action={
                  <ItemSuffix
                    type={item.type}
                    isParentSelected={item.id === selectedPageId}
                    itemId={item.id}
                    editingItemId={editingItemId}
                    onEdit={onEdit}
                  />
                }
              >
                {item.type === "folder" && (
                  <TreeNodeLabel prefix={<FolderIcon />}>
                    {item.folder.name}
                  </TreeNodeLabel>
                )}
                {item.type === "page" && (
                  <TreeNodeLabel
                    prefix={
                      item.id === pages?.homePage.id ? (
                        <HomeIcon />
                      ) : isPathnamePattern(item.page.path) ? (
                        <DynamicPageIcon />
                      ) : (
                        <PageIcon />
                      )
                    }
                  >
                    {item.page.name}
                  </TreeNodeLabel>
                )}
              </TreeNode>
            );
          })}
        </TreeRoot>
      </Box>
    </>
  );
};

const newPageId = "new-page";

const PageEditor = ({
  editingPageId,
  setEditingPageId,
}: {
  editingPageId: string;
  setEditingPageId: (pageId?: string) => void;
}) => {
  const currentPageId = useStore($selectedPageId);

  if (editingPageId === newPageId) {
    return (
      <NewPageSettings
        onClose={() => setEditingPageId(undefined)}
        onSuccess={(pageId) => {
          setEditingPageId(undefined);
          switchPage(pageId);
        }}
      />
    );
  }

  return (
    <PageSettings
      onClose={() => setEditingPageId(undefined)}
      onDelete={() => {
        setEditingPageId(undefined);
        // switch to home page when deleted currently selected page
        if (editingPageId === currentPageId) {
          const pages = $pages.get();
          if (pages) {
            switchPage(pages.homePage.id);
          }
        }
      }}
      onDuplicate={(newPageId) => {
        setEditingPageId(undefined);
        switchPage(newPageId);
      }}
      pageId={editingPageId}
      key={editingPageId}
    />
  );
};

const FolderEditor = ({
  editingFolderId,
  setEditingFolderId,
}: {
  editingFolderId: string;
  setEditingFolderId: (pageId?: string) => void;
}) => {
  if (editingFolderId === newFolderId) {
    return (
      <NewFolderSettings
        onClose={() => setEditingFolderId(undefined)}
        onSuccess={() => {
          setEditingFolderId(undefined);
        }}
        key={newFolderId}
      />
    );
  }

  return (
    <FolderSettings
      onClose={() => setEditingFolderId(undefined)}
      onDelete={() => {
        setEditingFolderId(undefined);
      }}
      folderId={editingFolderId}
      key={editingFolderId}
    />
  );
};

export const PagesPanel = ({ onClose }: { onClose: () => void }) => {
  const currentPageId = useStore($selectedPageId);
  const editingItemId = useStore($editingPageId);
  const pages = useStore($pages);

  if (currentPageId === undefined || pages === undefined) {
    return;
  }

  return (
    <>
      <PagesTree
        onClose={onClose}
        onCreateNewFolder={() => {
          $editingPageId.set(
            editingItemId === newFolderId ? undefined : newFolderId
          );
        }}
        onCreateNewPage={() =>
          $editingPageId.set(
            editingItemId === newPageId ? undefined : newPageId
          )
        }
        onSelect={(itemId) => {
          if (isFolder(itemId, pages.folders)) {
            return;
          }
          switchPage(itemId);
          onClose();
        }}
        selectedPageId={currentPageId}
        onEdit={$editingPageId.set}
        editingItemId={editingItemId}
      />

      <ExtendedPanel isOpen={editingItemId !== undefined}>
        {editingItemId !== undefined && (
          <>
            {isFolder(editingItemId, pages.folders) ? (
              <FolderEditor
                editingFolderId={editingItemId}
                setEditingFolderId={$editingPageId.set}
              />
            ) : (
              <PageEditor
                editingPageId={editingItemId}
                setEditingPageId={$editingPageId.set}
              />
            )}
          </>
        )}
      </ExtendedPanel>
    </>
  );
};
