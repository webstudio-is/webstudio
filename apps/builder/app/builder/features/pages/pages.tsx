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
  TreeSortableItem,
  type TreeDropTarget,
  toast,
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
import {
  $editingPageId,
  $isContentMode,
  $isDesignMode,
  $pages,
} from "~/shared/nano-states";
import {
  getAllChildrenAndSelf,
  reparentOrphansMutable,
  reparentPageOrFolderMutable,
} from "./page-utils";
import {
  FolderSettings,
  NewFolderSettings,
  newFolderId,
} from "./folder-settings";
import { serverSyncStore } from "~/shared/sync";
import { useMount } from "~/shared/hook-utils/use-mount";
import {
  isRootFolder,
  ROOT_FOLDER_ID,
  type Folder,
  type Page,
} from "@webstudio-is/sdk";
import { atom, computed } from "nanostores";
import { isPathnamePattern } from "~/builder/shared/url-pattern";
import { updateWebstudioData } from "~/shared/instance-utils";
import { $selectedPage, selectPage } from "~/shared/awareness";

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
      selector: string[];
      level: number;
      isExpanded?: boolean;
      type: "page";
      page: Page;
      isLastChild: boolean;
      dropTarget?: TreeDropTarget;
    }
  | {
      id: string;
      selector: string[];
      level: number;
      isExpanded?: boolean;
      type: "folder";
      folder: Folder;
      isLastChild: boolean;
      dropTarget?: TreeDropTarget;
    };

type DropTarget = {
  parentId: string;
  beforeId?: string;
  afterId?: string;
  indexWithinChildren: number;
};

const $dropTarget = atom<undefined | DropTarget>();

const getStoredDropTarget = (
  selector: string[],
  dropTarget: TreeDropTarget
): undefined | DropTarget => {
  const parentId = selector.at(-dropTarget.parentLevel - 1);
  const beforeId =
    dropTarget.beforeLevel === undefined
      ? undefined
      : selector.at(-dropTarget.beforeLevel - 1);
  const afterId =
    dropTarget.afterLevel === undefined
      ? undefined
      : selector.at(-dropTarget.afterLevel - 1);
  const pages = $pages.get();
  const parentFolder = pages?.folders.find((item) => item.id === parentId);
  let indexWithinChildren = 0;
  if (parentFolder) {
    const beforeIndex = parentFolder.children.indexOf(beforeId ?? "");
    const afterIndex = parentFolder.children.indexOf(afterId ?? "");
    if (beforeIndex > -1) {
      indexWithinChildren = beforeIndex;
    } else if (afterIndex > -1) {
      indexWithinChildren = afterIndex + 1;
    }
  }
  if (parentId) {
    return { parentId, beforeId, afterId, indexWithinChildren };
  }
};

const $flatPagesTree = computed(
  [$pages, $expandedItems, $dropTarget],
  (pagesData, expandedItems, dropTarget) => {
    const flatPagesTree: PagesTreeItem[] = [];
    if (pagesData === undefined) {
      return flatPagesTree;
    }
    const folders = new Map(
      pagesData.folders.map((folder) => [folder.id, folder])
    );
    const pages = new Map(pagesData.pages.map((page) => [page.id, page]));
    pages.set(pagesData.homePage.id, pagesData.homePage);
    const traverse = (selector: string[], level = 0, isLastChild = false) => {
      const [itemId] = selector;
      let treeItem: undefined | PagesTreeItem;
      let lastTreeItem: undefined | PagesTreeItem;
      const folder = folders.get(itemId);
      const page = pages.get(itemId);
      if (page) {
        treeItem = {
          id: itemId,
          selector,
          level,
          type: "page",
          page,
          isLastChild,
        };
        lastTreeItem = treeItem;
        flatPagesTree.push(treeItem);
      }
      if (folder) {
        let isExpanded: undefined | boolean;
        if (level > 0 && folder.children.length > 0) {
          isExpanded = expandedItems.has(folder.id);
        }
        // hide root folder
        if (itemId !== ROOT_FOLDER_ID) {
          treeItem = {
            id: itemId,
            selector,
            level,
            isExpanded,
            type: "folder",
            folder,
            isLastChild,
          };
          lastTreeItem = treeItem;
          flatPagesTree.push(treeItem);
        }
        if (level === 0 || isExpanded) {
          for (let index = 0; index < folder.children.length; index += 1) {
            const childId = folder.children[index];
            const isLastChild = index === folder.children.length - 1;
            lastTreeItem = traverse(
              [childId, ...selector],
              level + 1,
              isLastChild
            );
          }
        }
      }

      if (treeItem && dropTarget?.beforeId === itemId) {
        treeItem.dropTarget = {
          parentLevel: level - 1,
          beforeLevel: level,
        };
      }
      if (lastTreeItem && dropTarget?.afterId === itemId) {
        lastTreeItem.dropTarget = {
          parentLevel: level - 1,
          afterLevel: level,
        };
      }
      return lastTreeItem;
    };
    traverse([ROOT_FOLDER_ID]);
    return flatPagesTree;
  }
);

const canDrop = (dropTarget: DropTarget, folders: Folder[]) => {
  // allow dropping only inside folders
  if (isFolder(dropTarget.parentId, folders) === false) {
    return false;
  }
  // forbid dropping in the beginning of root folder
  // which is always used by home page
  if (
    isRootFolder({ id: dropTarget.parentId }) &&
    dropTarget.indexWithinChildren === 0
  ) {
    return false;
  }
  return true;
};

const PagesTree = ({
  onSelect,
  selectedPageId,
  onEdit,
  editingItemId,
}: {
  onSelect: (pageId: string) => void;
  selectedPageId: string;
  onEdit: (pageId: string | undefined) => void;
  editingItemId?: string;
}) => {
  const pages = useStore($pages);
  const flatPagesTree = useStore($flatPagesTree);
  const dropTarget = useStore($dropTarget);
  useReparentOrphans();

  if (pages === undefined) {
    return null;
  }

  return (
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
            <TreeSortableItem
              key={item.id}
              level={item.level}
              isExpanded={item.isExpanded}
              isLastChild={item.isLastChild}
              data={item}
              canDrag={() => {
                if ($isContentMode.get()) {
                  return false;
                }

                // forbid dragging home page
                if (item.id === pages.homePage.id) {
                  toast.error("Home page cannot be moved");
                  return false;
                }
                return true;
              }}
              onExpand={(isExpanded) => handleExpand(isExpanded, false)}
              dropTarget={item.dropTarget}
              onDropTargetChange={(dropTarget) => {
                if (dropTarget) {
                  const storedDropTarget = getStoredDropTarget(
                    item.selector,
                    dropTarget
                  );
                  if (
                    storedDropTarget &&
                    canDrop(storedDropTarget, pages.folders)
                  ) {
                    $dropTarget.set(storedDropTarget);
                  }
                } else {
                  $dropTarget.set(undefined);
                }
              }}
              onDrop={(item) => {
                if (dropTarget === undefined) {
                  return;
                }
                updateWebstudioData((data) => {
                  reparentPageOrFolderMutable(
                    data.pages.folders,
                    item.id,
                    dropTarget.parentId,
                    dropTarget.indexWithinChildren
                  );
                });
                $dropTarget.set(undefined);
              }}
            >
              <TreeNode
                level={item.level}
                tabbable={index === 0}
                isSelected={item.id === selectedPageId}
                isHighlighted={dropTarget?.parentId === item.id}
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
            </TreeSortableItem>
          );
        })}
      </TreeRoot>
    </Box>
  );
};

const newPageId = "new-page";

const PageEditor = ({
  editingPageId,
  onClose,
}: {
  editingPageId: string;
  onClose: () => void;
}) => {
  const currentPage = useStore($selectedPage);

  if (editingPageId === newPageId) {
    return (
      <NewPageSettings
        onClose={onClose}
        onSuccess={(pageId) => {
          onClose();
          selectPage(pageId);
        }}
      />
    );
  }

  return (
    <PageSettings
      onClose={onClose}
      onDelete={() => {
        onClose();
        // switch to home page when deleted currently selected page
        if (editingPageId === currentPage?.id) {
          const pages = $pages.get();
          if (pages) {
            selectPage(pages.homePage.id);
          }
        }
      }}
      onDuplicate={(newPageId) => {
        onClose();
        selectPage(newPageId);
      }}
      pageId={editingPageId}
      key={editingPageId}
    />
  );
};

const FolderEditor = ({
  editingFolderId,
  onClose,
}: {
  editingFolderId: string;
  onClose: () => void;
}) => {
  if (editingFolderId === newFolderId) {
    return (
      <NewFolderSettings
        key={newFolderId}
        onClose={onClose}
        onSuccess={onClose}
      />
    );
  }

  return (
    <FolderSettings
      onClose={onClose}
      onDelete={onClose}
      folderId={editingFolderId}
      key={editingFolderId}
    />
  );
};

export const PagesPanel = ({ onClose }: { onClose: () => void }) => {
  const currentPage = useStore($selectedPage);
  const editingItemId = useStore($editingPageId);
  const pages = useStore($pages);
  const isDesignMode = useStore($isDesignMode);

  if (currentPage === undefined || pages === undefined) {
    return;
  }

  return (
    <>
      <PanelTitle
        suffix={
          <>
            {isDesignMode && (
              <>
                <Tooltip content="New folder" side="bottom">
                  <Button
                    onClick={() => {
                      $editingPageId.set(
                        editingItemId === newFolderId ? undefined : newFolderId
                      );
                    }}
                    aria-label="New folder"
                    prefix={<NewFolderIcon />}
                    color="ghost"
                  />
                </Tooltip>
                <Tooltip content="New page" side="bottom">
                  <Button
                    onClick={() => {
                      $editingPageId.set(
                        editingItemId === newPageId ? undefined : newPageId
                      );
                    }}
                    aria-label="New page"
                    prefix={<NewPageIcon />}
                    color="ghost"
                  />
                </Tooltip>
              </>
            )}
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

      <PagesTree
        selectedPageId={currentPage.id}
        onSelect={(itemId) => {
          selectPage(itemId);
          onClose();
        }}
        editingItemId={editingItemId}
        onEdit={(itemId) => {
          // always select page when edit its settings
          if (itemId && isFolder(itemId, pages.folders) === false) {
            selectPage(itemId);
          }
          $editingPageId.set(itemId);
        }}
      />
      {editingItemId !== undefined && (
        <ExtendedPanel>
          <>
            {isFolder(editingItemId, pages.folders) ? (
              <FolderEditor
                editingFolderId={editingItemId}
                onClose={() => $editingPageId.set(undefined)}
              />
            ) : (
              <PageEditor
                editingPageId={editingItemId}
                onClose={() => $editingPageId.set(undefined)}
              />
            )}
          </>
        </ExtendedPanel>
      )}
    </>
  );
};
