import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useStore } from "@nanostores/react";
import {
  Tooltip,
  Button,
  Flex,
  SmallIconButton,
  TreeNode,
  TreeRoot,
  TreeNodeLabel,
  PanelTitle,
  Separator,
  TreeSortableItem,
  type TreeDropTarget,
  toast,
  ScrollAreaNative,
  FloatingPanel,
  rawTheme,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@webstudio-is/design-system";
import {
  ChevronRightIcon,
  FolderIcon,
  HomeIcon,
  EllipsesIcon,
  PageIcon,
  DynamicPageIcon,
  PlusIcon,
} from "@webstudio-is/icons";
import { NewPageSettings, PageSettings } from "./page-settings/page-settings";
import { PageContextMenu, TemplateContextMenu } from "./page-context-menu";
import {
  NewTemplateSettings,
  TemplateSettings,
  CreatePageFromTemplateSettings,
} from "./template-settings";
import {
  DeletePageConfirmationDialog,
  DeleteFolderConfirmationDialog,
  DeleteTemplateConfirmationDialog,
} from "./confirmation-dialogs";
import {
  $editingPageId,
  $editingTemplateId,
  $creatingPageFromTemplateId,
  $authPermit,
  $canOpenPageTemplates,
  $isContentMode,
  $isDesignMode,
  $folderIdToDelete,
  $pageIdToDelete,
  $templateIdToDelete,
} from "~/shared/nano-states";
import { $pages } from "~/shared/sync/data-stores";
import { getAllChildrenAndSelf } from "@webstudio-is/project-build/runtime/pages";
import {
  reparentOrphansMutable,
  reparentPageOrFolderMutable,
} from "~/shared/page-utils/tree";
import {
  deletePageMutable,
  deleteFolderWithChildrenMutable,
  duplicateFolder,
  isFolder,
  getStoredDropTarget,
  canDrop,
  deleteTemplateMutable,
  reorderTemplatesMutable,
} from "./page-utils";
import {
  FolderSettings,
  NewFolderSettings,
  newFolderId,
} from "./folder-settings";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { useMount } from "~/shared/hook-utils/use-mount";
import {
  type Folder,
  type Page,
  type PageTemplate,
  findPageByIdOrPath,
  getFolderById,
} from "@webstudio-is/sdk";
import { atom, computed } from "nanostores";
import { isPathnamePattern } from "~/builder/shared/url-pattern";
import { updateWebstudioData } from "~/shared/instance-utils/data";
import { $selectedPage } from "~/shared/nano-states";
import { selectPage } from "~/shared/nano-states";

const ItemSuffix = ({
  itemId,
  editingItemId,
  onEdit,
  type,
  canEdit,
}: {
  itemId: string;
  editingItemId: string | undefined;
  onEdit: (itemId: string | undefined) => void;
  type: "folder" | "page";
  canEdit: boolean;
}) => {
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

  if (canEdit === false) {
    return;
  }

  const isEditing = editingItemId === itemId;

  const menuLabel =
    type === "page"
      ? isEditing
        ? "Close page settings"
        : "Open page settings"
      : isEditing
        ? "Close folder settings"
        : "Open folder settings";

  return (
    <Tooltip content={menuLabel} disableHoverableContent>
      <SmallIconButton
        tabIndex={-1}
        aria-label={menuLabel}
        state={isEditing ? "open" : undefined}
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

type TemplateDropInfo = {
  targetId: string;
  treeDropTarget: TreeDropTarget;
};
const $templateDropInfo = atom<TemplateDropInfo | undefined>(undefined);

const $flatPagesTree = computed(
  [$pages, $expandedItems, $dropTarget],
  (pagesData, expandedItems, dropTarget) => {
    const flatPagesTree: PagesTreeItem[] = [];
    if (pagesData === undefined) {
      return flatPagesTree;
    }
    const folders = pagesData.folders;
    const pages = pagesData.pages;
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
        if (itemId !== pagesData.rootFolderId) {
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
    traverse([pagesData.rootFolderId]);
    return flatPagesTree;
  }
);

const PagesTree = ({
  onSelect,
  onRequestDeletePage,
  onRequestDeleteFolder,
  selectedPageId,
  onEdit,
  editingItemId,
  canManagePages,
  canEditPageSettings,
}: {
  onSelect: (pageId: string) => void;
  onRequestDeletePage: (pageId: string) => void;
  onRequestDeleteFolder: (folderId: string) => void;
  selectedPageId: string;
  onEdit: (pageId: string | undefined) => void;
  editingItemId?: string;
  canManagePages: boolean;
  canEditPageSettings: boolean;
}) => {
  const pages = useStore($pages);
  const flatPagesTree = useStore($flatPagesTree);
  const dropTarget = useStore($dropTarget);
  useReparentOrphans();

  if (pages === undefined) {
    return null;
  }

  return (
    <ScrollAreaNative
      css={{
        width: "100%",
        flexBasis: 0,
        flexGrow: 1,
      }}
    >
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
                if (item.id === pages.homePageId) {
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
                  if (storedDropTarget && canDrop(storedDropTarget, pages)) {
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
                nodeProps={{
                  role: "group",
                  "aria-label":
                    item.type === "page"
                      ? `Page ${item.page.name}`
                      : `Folder ${item.folder.name}`,
                }}
                buttonProps={{
                  onClick: (event) => {
                    if (item.type === "folder") {
                      handleExpand(item.isExpanded === false, event.altKey);
                    }
                    if (item.type === "page") {
                      onSelect(item.id);
                    }
                  },
                  onKeyDown: (event) => {
                    if (
                      canManagePages === false ||
                      (event.key !== "Backspace" && event.key !== "Delete")
                    ) {
                      return;
                    }
                    if (item.type === "page" && item.id === pages.homePageId) {
                      return;
                    }
                    event.preventDefault();
                    if (item.type === "page") {
                      onRequestDeletePage(item.id);
                    } else {
                      onRequestDeleteFolder(item.id);
                    }
                  },
                  ...(item.type === "page" &&
                    item.id !== pages?.homePageId && {
                      "data-page-id": item.id,
                    }),
                  ...(item.type === "folder" &&
                    item.id !== pages.rootFolderId && {
                      "data-folder-id": item.id,
                    }),
                }}
                action={
                  <ItemSuffix
                    type={item.type}
                    itemId={item.id}
                    editingItemId={editingItemId}
                    onEdit={onEdit}
                    canEdit={canEditPagesTreeItemSettings({
                      itemType: item.type,
                      canManagePages,
                      canEditPageSettings,
                    })}
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
                      item.id === pages?.homePageId ? (
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
    </ScrollAreaNative>
  );
};

const newPageId = "new-page";
const newTemplateId = "new-template";

const canEditPagesTreeItemSettings = ({
  itemType,
  canManagePages,
  canEditPageSettings,
}: {
  itemType: PagesTreeItem["type"];
  canManagePages: boolean;
  canEditPageSettings: boolean;
}) => {
  return itemType === "page" ? canEditPageSettings : canManagePages;
};

const canEditPagesPanelItemSettings = ({
  itemId,
  folders,
  canManagePages,
  canEditPageSettings,
}: {
  itemId: string;
  folders: Map<Folder["id"], Folder>;
  canManagePages: boolean;
  canEditPageSettings: boolean;
}) => {
  return canEditPagesTreeItemSettings({
    itemType:
      itemId === newFolderId || isFolder(itemId, folders) ? "folder" : "page",
    canManagePages,
    canEditPageSettings,
  });
};

export const __testing__ = {
  canEditPagesPanelItemSettings,
  canEditPagesTreeItemSettings,
};

const CreateItemMenu = ({
  editingItemId,
  editingTemplateItemId,
}: {
  editingItemId: string | undefined;
  editingTemplateItemId: string | undefined;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectMenuItem = (callback: () => void) => {
    setIsOpen(false);
    requestAnimationFrame(callback);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip content="Create" side="bottom">
        <DropdownMenuTrigger asChild>
          <Button aria-label="Create" prefix={<PlusIcon />} color="ghost" />
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent
        side="bottom"
        align="end"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            selectMenuItem(() => {
              $editingTemplateId.set(undefined);
              $editingPageId.set(
                editingItemId === newPageId ? undefined : newPageId
              );
            });
          }}
        >
          New page
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            selectMenuItem(() => {
              $editingTemplateId.set(undefined);
              $editingPageId.set(
                editingItemId === newFolderId ? undefined : newFolderId
              );
            });
          }}
        >
          New folder
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            selectMenuItem(() => {
              $editingPageId.set(undefined);
              $editingTemplateId.set(
                editingTemplateItemId === newTemplateId
                  ? undefined
                  : newTemplateId
              );
            });
          }}
        >
          New page template
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const PageEditor = ({
  editingPageId,
  onClose,
}: {
  editingPageId: string;
  onClose: () => void;
}) => {
  const currentPage = useStore($selectedPage);
  const pages = useStore($pages);
  const [pageIdToDelete, setPageIdToDelete] = useState<string | undefined>();

  if (editingPageId === newPageId) {
    return (
      <NewPageSettings
        onSuccess={(pageId) => {
          onClose();
          selectPage(pageId);
        }}
      />
    );
  }

  const handleRequestDelete = () => {
    if (pages) {
      const page = findPageByIdOrPath(editingPageId, pages);
      if (page) {
        setPageIdToDelete(page.id);
      }
    }
  };

  const handleDelete = () => {
    if (pageIdToDelete) {
      updateWebstudioData((data) => {
        deletePageMutable(pageIdToDelete, data);
      });
    }
    onClose();
    // switch to home page when deleted currently selected page
    if (editingPageId === currentPage?.id) {
      if (pages) {
        selectPage(pages.homePageId);
      }
    }
  };

  return (
    <>
      <PageSettings
        onClose={onClose}
        onDelete={handleRequestDelete}
        onDuplicate={(newPageId) => {
          onClose();
          selectPage(newPageId);
        }}
        pageId={editingPageId}
        key={editingPageId}
      />
      {pageIdToDelete && pages && (
        <DeletePageConfirmationDialog
          page={findPageByIdOrPath(pageIdToDelete, pages)!}
          onClose={() => setPageIdToDelete(undefined)}
          onConfirm={() => {
            setPageIdToDelete(undefined);
            handleDelete();
          }}
        />
      )}
    </>
  );
};

const FolderEditor = ({
  editingFolderId,
  onClose,
}: {
  editingFolderId: string;
  onClose: () => void;
}) => {
  const pages = useStore($pages);
  const [folderIdToDelete, setFolderIdToDelete] = useState<
    string | undefined
  >();

  const handleRequestDelete = () => {
    setFolderIdToDelete(editingFolderId);
  };

  const handleDuplicate = () => {
    const newFolderId = duplicateFolder(editingFolderId);
    if (newFolderId) {
      $editingPageId.set(newFolderId);
    }
  };

  if (editingFolderId === newFolderId) {
    return (
      <NewFolderSettings
        key={newFolderId}
        onClose={onClose}
        onSuccess={onClose}
      />
    );
  }

  const handleDelete = () => {
    if (folderIdToDelete) {
      updateWebstudioData((data) => {
        const { pageIds } = deleteFolderWithChildrenMutable(
          folderIdToDelete,
          data.pages
        );
        pageIds.forEach((pageId) => {
          deletePageMutable(pageId, data);
        });
      });
    }
    onClose();
  };

  const folder =
    pages === undefined ? undefined : getFolderById(pages, editingFolderId);

  return (
    <>
      <FolderSettings
        onClose={onClose}
        onRequestDelete={handleRequestDelete}
        onDuplicate={handleDuplicate}
        folderId={editingFolderId}
        key={editingFolderId}
      />
      {folderIdToDelete && folder && (
        <DeleteFolderConfirmationDialog
          folder={folder}
          onClose={() => setFolderIdToDelete(undefined)}
          onConfirm={() => {
            setFolderIdToDelete(undefined);
            handleDelete();
          }}
        />
      )}
    </>
  );
};

const TemplateItem = ({
  template,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onCreatePage,
  onRequestDelete,
  canSelectTemplate,
  canEditTemplate,
  canCreatePage,
}: {
  template: PageTemplate;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string | undefined) => void;
  onCreatePage: (id: string) => void;
  onRequestDelete: (id: string) => void;
  canSelectTemplate: boolean;
  canEditTemplate: boolean;
  canCreatePage: boolean;
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const prevIsEditing = useRef(isEditing);
  useEffect(() => {
    if (!isEditing && prevIsEditing.current && buttonRef.current) {
      buttonRef.current.focus();
    }
    prevIsEditing.current = isEditing;
  }, [isEditing]);

  return (
    <TreeNode
      level={1}
      isSelected={isSelected}
      buttonProps={Object.assign(
        canSelectTemplate
          ? {
              onClick: () => onSelect(template.id),
              onKeyDown: (event: KeyboardEvent) => {
                if (
                  canEditTemplate === false ||
                  (event.key !== "Backspace" && event.key !== "Delete")
                ) {
                  return;
                }
                event.preventDefault();
                onRequestDelete(template.id);
              },
            }
          : {},
        { "data-template-id": template.id }
      )}
      actionCount={(canCreatePage ? 1 : 0) + (canEditTemplate ? 1 : 0)}
      action={
        <Flex align="center" gap={2}>
          {canCreatePage && (
            <Tooltip
              content="Create page from template"
              disableHoverableContent
            >
              <SmallIconButton
                tabIndex={-1}
                aria-label="Create page from template"
                onClick={() => onCreatePage(template.id)}
                icon={<PlusIcon />}
              />
            </Tooltip>
          )}
          {canEditTemplate && (
            <Tooltip
              content={
                isEditing ? "Close template settings" : "Open template settings"
              }
              disableHoverableContent
            >
              <SmallIconButton
                tabIndex={-1}
                aria-label={
                  isEditing
                    ? "Close template settings"
                    : "Open template settings"
                }
                state={isEditing ? "open" : undefined}
                onClick={() => onEdit(isEditing ? undefined : template.id)}
                ref={buttonRef}
                aria-current={isEditing}
                icon={isEditing ? <ChevronRightIcon /> : <EllipsesIcon />}
              />
            </Tooltip>
          )}
        </Flex>
      }
    >
      <TreeNodeLabel prefix={<PageIcon />}>{template.name}</TreeNodeLabel>
    </TreeNode>
  );
};

const TemplatesSection = ({
  selectedPageId,
  onSelectTemplate,
  editingTemplateId,
  onEditTemplate,
  onCreatePageFromTemplate,
  onRequestDeleteTemplate,
  canManageTemplates,
  canSelectTemplate,
  canCreatePageFromTemplate,
}: {
  selectedPageId: string;
  onSelectTemplate: (id: string) => void;
  editingTemplateId: string | undefined;
  onEditTemplate: (id: string | undefined) => void;
  onCreatePageFromTemplate: (id: string) => void;
  onRequestDeleteTemplate: (id: string) => void;
  canManageTemplates: boolean;
  canSelectTemplate: boolean;
  canCreatePageFromTemplate: boolean;
}) => {
  const pages = useStore($pages);
  const dropInfo = useStore($templateDropInfo);
  const templates = Array.from(pages?.pageTemplates?.values() ?? []);

  if (templates.length === 0) {
    return null;
  }

  return (
    <TreeRoot>
      {templates.map((template, index) => (
        <TreeSortableItem
          key={template.id}
          level={1}
          isExpanded={undefined}
          isLastChild={index === templates.length - 1}
          data={template}
          canDrag={() => canManageTemplates}
          dropTarget={
            canManageTemplates && dropInfo?.targetId === template.id
              ? dropInfo.treeDropTarget
              : undefined
          }
          onDropTargetChange={(treeDropTarget) => {
            if (canManageTemplates === false) {
              return;
            }
            if (treeDropTarget) {
              $templateDropInfo.set({
                targetId: template.id,
                treeDropTarget,
              });
            } else if ($templateDropInfo.get()?.targetId === template.id) {
              $templateDropInfo.set(undefined);
            }
          }}
          onDrop={(draggedTemplate) => {
            if (canManageTemplates === false) {
              return;
            }
            const info = $templateDropInfo.get();
            if (info === undefined) {
              return;
            }
            updateWebstudioData((data) => {
              reorderTemplatesMutable(
                draggedTemplate.id,
                template.id,
                info.treeDropTarget.beforeLevel !== undefined
                  ? "before"
                  : "after",
                data
              );
            });
            $templateDropInfo.set(undefined);
          }}
          onExpand={() => {}}
        >
          <TemplateItem
            template={template}
            isSelected={template.id === selectedPageId}
            isEditing={editingTemplateId === template.id}
            onSelect={onSelectTemplate}
            onEdit={onEditTemplate}
            onCreatePage={onCreatePageFromTemplate}
            onRequestDelete={onRequestDeleteTemplate}
            canSelectTemplate={canSelectTemplate}
            canEditTemplate={canManageTemplates}
            canCreatePage={canCreatePageFromTemplate}
          />
        </TreeSortableItem>
      ))}
    </TreeRoot>
  );
};

const TemplateEditor = ({
  editingTemplateId,
  onClose,
}: {
  editingTemplateId: string;
  onClose: () => void;
}) => {
  const currentPage = useStore($selectedPage);
  const pages = useStore($pages);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (editingTemplateId === newTemplateId) {
    return (
      <NewTemplateSettings
        onSuccess={(templateId) => {
          onClose();
          selectPage(templateId);
        }}
      />
    );
  }

  const template = pages?.pageTemplates?.get(editingTemplateId);

  return (
    <>
      <TemplateSettings
        onClose={onClose}
        onDelete={() => setConfirmingDelete(true)}
        onDuplicate={(newId) => {
          onClose();
          selectPage(newId);
        }}
        templateId={editingTemplateId}
        key={editingTemplateId}
      />
      {confirmingDelete && template && (
        <DeleteTemplateConfirmationDialog
          template={template}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => {
            updateWebstudioData((data) => {
              deleteTemplateMutable(editingTemplateId, data);
            });
            if (currentPage?.id === editingTemplateId && pages) {
              selectPage(pages.homePageId);
            }
            setConfirmingDelete(false);
            onClose();
          }}
        />
      )}
    </>
  );
};

export const PagesPanel = ({ onClose }: { onClose: () => void }) => {
  const currentPage = useStore($selectedPage);
  const editingItemId = useStore($editingPageId);
  const editingTemplateItemId = useStore($editingTemplateId);
  const creatingFromTemplateId = useStore($creatingPageFromTemplateId);
  const pages = useStore($pages);
  const isDesignMode = useStore($isDesignMode);
  const isContentMode = useStore($isContentMode);
  const authPermit = useStore($authPermit);
  const canOpenPageTemplates = useStore($canOpenPageTemplates);
  const canEditPageContent =
    isDesignMode || (isContentMode && authPermit !== "view");
  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [settingsPanelHeight, setSettingsPanelHeight] = useState<number>();
  const pageIdToDelete = useStore($pageIdToDelete);
  const folderIdToDelete = useStore($folderIdToDelete);
  const templateIdToDelete = useStore($templateIdToDelete);

  useEffect(() => {
    if (containerElement === null) {
      return;
    }
    const updateHeight = () => {
      setSettingsPanelHeight(containerElement.getBoundingClientRect().height);
    };
    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(containerElement);
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerElement]);

  if (currentPage === undefined || pages === undefined) {
    return;
  }

  const handlePageDeleteConfirm = () => {
    if (pageIdToDelete) {
      updateWebstudioData((data) => {
        deletePageMutable(pageIdToDelete, data);
      });
      if (editingItemId === pageIdToDelete) {
        $editingPageId.set(undefined);
      }
    }
    $pageIdToDelete.set(undefined);
  };

  const handleDeleteFolderConfirm = () => {
    if (folderIdToDelete) {
      updateWebstudioData((data) => {
        const { pageIds } = deleteFolderWithChildrenMutable(
          folderIdToDelete,
          data.pages
        );
        pageIds.forEach((pageId) => {
          deletePageMutable(pageId, data);
        });
      });
      if (editingItemId === folderIdToDelete) {
        $editingPageId.set(undefined);
      }
    }
    $folderIdToDelete.set(undefined);
  };

  const handleTemplateDeleteConfirm = () => {
    if (templateIdToDelete) {
      updateWebstudioData((data) => {
        deleteTemplateMutable(templateIdToDelete, data);
      });
      if (editingTemplateItemId === templateIdToDelete) {
        $editingTemplateId.set(undefined);
      }
      if (currentPage?.id === templateIdToDelete) {
        selectPage(pages.homePageId);
      }
    }
    $templateIdToDelete.set(undefined);
  };

  const templateToDelete =
    templateIdToDelete === undefined
      ? undefined
      : pages.pageTemplates?.get(templateIdToDelete);
  const hasPageTemplates = (pages.pageTemplates?.size ?? 0) > 0;
  const canEditSettingsPanel =
    editingItemId !== undefined &&
    canEditPagesPanelItemSettings({
      itemId: editingItemId,
      folders: pages.folders,
      canManagePages: isDesignMode,
      canEditPageSettings: canEditPageContent,
    });

  return (
    <div
      ref={setContainerElement}
      data-floating-panel-container
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <PanelTitle
        suffix={
          isDesignMode ? (
            <CreateItemMenu
              editingItemId={editingItemId}
              editingTemplateItemId={editingTemplateItemId}
            />
          ) : undefined
        }
      >
        Pages
      </PanelTitle>
      <Separator />

      <PageContextMenu
        canManagePages={isDesignMode}
        onRequestDeletePage={(pageId) => $pageIdToDelete.set(pageId)}
        onRequestDeleteFolder={(folderId) => $folderIdToDelete.set(folderId)}
      >
        <div>
          <PagesTree
            selectedPageId={currentPage.id}
            onRequestDeletePage={(pageId) => $pageIdToDelete.set(pageId)}
            onRequestDeleteFolder={(folderId) =>
              $folderIdToDelete.set(folderId)
            }
            onSelect={(itemId) => {
              selectPage(itemId);
              onClose();
            }}
            editingItemId={editingItemId}
            canManagePages={isDesignMode}
            canEditPageSettings={canEditPageContent}
            onEdit={(itemId) => {
              if (
                itemId &&
                canEditPagesPanelItemSettings({
                  itemId,
                  folders: pages.folders,
                  canManagePages: isDesignMode,
                  canEditPageSettings: canEditPageContent,
                }) === false
              ) {
                return;
              }
              // always select page when edit its settings
              if (itemId && isFolder(itemId, pages.folders) === false) {
                selectPage(itemId);
              }
              if (itemId) {
                $editingTemplateId.set(undefined);
              }
              $editingPageId.set(itemId);
            }}
          />
        </div>
      </PageContextMenu>

      {canEditPageContent && hasPageTemplates && (
        <>
          <Separator />
          <PanelTitle>Page templates</PanelTitle>
          {canOpenPageTemplates ? (
            <TemplateContextMenu
              canManageTemplates={isDesignMode}
              onRequestDeleteTemplate={(templateId) =>
                $templateIdToDelete.set(templateId)
              }
            >
              <ScrollAreaNative
                css={{
                  width: "100%",
                  flexBasis: 0,
                  flexGrow: 1,
                }}
              >
                <TemplatesSection
                  selectedPageId={currentPage.id}
                  onSelectTemplate={(id) => {
                    selectPage(id);
                  }}
                  editingTemplateId={editingTemplateItemId}
                  onEditTemplate={(id) => {
                    if (id) {
                      selectPage(id);
                      $editingPageId.set(undefined);
                    }
                    $editingTemplateId.set(id);
                  }}
                  onCreatePageFromTemplate={(id) => {
                    $creatingPageFromTemplateId.set(id);
                  }}
                  onRequestDeleteTemplate={(templateId) =>
                    $templateIdToDelete.set(templateId)
                  }
                  canManageTemplates={isDesignMode}
                  canSelectTemplate={true}
                  canCreatePageFromTemplate={canEditPageContent}
                />
              </ScrollAreaNative>
            </TemplateContextMenu>
          ) : (
            <ScrollAreaNative
              css={{
                width: "100%",
                flexBasis: 0,
                flexGrow: 1,
              }}
            >
              <TemplatesSection
                selectedPageId={currentPage.id}
                onSelectTemplate={() => {}}
                editingTemplateId={editingTemplateItemId}
                onEditTemplate={() => {}}
                onCreatePageFromTemplate={(id) => {
                  $creatingPageFromTemplateId.set(id);
                }}
                onRequestDeleteTemplate={() => {}}
                canManageTemplates={false}
                canSelectTemplate={false}
                canCreatePageFromTemplate={canEditPageContent}
              />
            </ScrollAreaNative>
          )}
        </>
      )}

      {canEditSettingsPanel && (
        <FloatingPanel
          content={
            editingItemId === newFolderId ||
            isFolder(editingItemId, pages.folders) ? (
              <FolderEditor
                editingFolderId={editingItemId}
                onClose={() => $editingPageId.set(undefined)}
              />
            ) : (
              <PageEditor
                editingPageId={editingItemId}
                onClose={() => $editingPageId.set(undefined)}
              />
            )
          }
          placement="right-start"
          width={Number.parseFloat(rawTheme.spacing[35])}
          height={settingsPanelHeight}
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              $editingPageId.set(undefined);
            }
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              pointerEvents: "none",
            }}
          />
        </FloatingPanel>
      )}

      {isDesignMode &&
        canOpenPageTemplates &&
        editingTemplateItemId !== undefined && (
          <FloatingPanel
            content={
              <TemplateEditor
                editingTemplateId={editingTemplateItemId}
                onClose={() => $editingTemplateId.set(undefined)}
              />
            }
            placement="right-start"
            width={Number.parseFloat(rawTheme.spacing[35])}
            open={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                $editingTemplateId.set(undefined);
              }
            }}
          >
            <span style={{ display: "none" }} />
          </FloatingPanel>
        )}

      {canEditPageContent && creatingFromTemplateId !== undefined && (
        <FloatingPanel
          content={
            <CreatePageFromTemplateSettings
              templateId={creatingFromTemplateId}
              onSuccess={(newPageId) => {
                $creatingPageFromTemplateId.set(undefined);
                selectPage(newPageId);
              }}
            />
          }
          placement="right-start"
          width={Number.parseFloat(rawTheme.spacing[35])}
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              $creatingPageFromTemplateId.set(undefined);
            }
          }}
        >
          <span style={{ display: "none" }} />
        </FloatingPanel>
      )}

      {pageIdToDelete && (
        <DeletePageConfirmationDialog
          page={findPageByIdOrPath(pageIdToDelete, pages)!}
          onClose={() => $pageIdToDelete.set(undefined)}
          onConfirm={handlePageDeleteConfirm}
        />
      )}
      {folderIdToDelete && (
        <DeleteFolderConfirmationDialog
          folder={getFolderById(pages, folderIdToDelete)!}
          onClose={() => $folderIdToDelete.set(undefined)}
          onConfirm={handleDeleteFolderConfirm}
        />
      )}
      {templateToDelete && (
        <DeleteTemplateConfirmationDialog
          template={templateToDelete}
          onClose={() => $templateIdToDelete.set(undefined)}
          onConfirm={handleTemplateDeleteConfirm}
        />
      )}
    </div>
  );
};
