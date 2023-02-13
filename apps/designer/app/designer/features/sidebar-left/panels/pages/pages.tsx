import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@remix-run/react";
import {
  DeprecatedIconButton,
  TreeItemLabel,
  TreeItemBody,
  TreeNode,
  type TreeItemRenderProps,
  styled,
  Flex,
  Tooltip,
  Box,
  Button,
  theme,
} from "@webstudio-is/design-system";
import {
  ChevronRightIcon,
  MenuIcon,
  NewPageIcon,
  PageIcon,
} from "@webstudio-is/icons";
import type { Page, Pages } from "@webstudio-is/project";
import type { Publish } from "~/shared/pubsub";
import {
  useCurrentPageId,
  usePages,
  useProject,
} from "~/designer/shared/nano-states";
import { designerPath } from "~/shared/router-utils";
import type { TabName } from "../../types";
import { CloseButton, Header } from "../../header";
import { SettingsPanel } from "./settings-panel";
import { NewPageSettings, PageSettings } from "./settings";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

type PagesTreeNode =
  | {
      // currently used only for root node
      type: "folder";
      id: string;
      children: PagesTreeNode[];
    }
  | {
      type: "page";
      id: string;
      data: Page;
    };

const toTreeData = (pages: Pages): PagesTreeNode => {
  return {
    type: "folder",
    id: "root",
    children: [pages.homePage, ...pages.pages].map((data) => ({
      type: "page",
      id: data.id,
      data,
    })),
  };
};

const staticTreeProps = {
  getItemChildren(node: PagesTreeNode) {
    if (node.type === "folder") {
      return node.children;
    }
    return [];
  },
  getIsExpanded(_node: PagesTreeNode) {
    return true;
  },
};

const MenuButton = styled(DeprecatedIconButton, {
  color: theme.colors.hint,
  "&:hover, &:focus-visible": { color: theme.colors.hiContrast },
  variants: {
    isParentSelected: {
      true: {
        color: theme.colors.loContrast,
        "&:hover, &:focus-visible": { color: theme.colors.slate7 },
      },
    },
  },
});

const ItemSuffix = ({
  isParentSelected,
  itemId,
  editingItemId,
  onEdit,
}: {
  isParentSelected: boolean;
  itemId: string;
  editingItemId: string | undefined;
  onEdit: (itemId: string | undefined) => void;
}) => {
  const isEditing = editingItemId === itemId;

  const menuLabel = isEditing ? "Close page settings" : "Open page settings";

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
    <Flex css={{ mr: theme.spacing[5] }} align="center">
      <Tooltip content={menuLabel} disableHoverableContent>
        <MenuButton
          aria-label={menuLabel}
          isParentSelected={isParentSelected}
          onClick={() => onEdit(isEditing ? undefined : itemId)}
          ref={buttonRef}
        >
          {isEditing ? <ChevronRightIcon /> : <MenuIcon />}
        </MenuButton>
      </Tooltip>
    </Flex>
  );
};

const PagesPanel = ({
  onClose,
  onCreateNewPage,
  onSelect,
  selectedPageId,
  onEdit,
  editingPageId,
}: {
  onClose?: () => void;
  onCreateNewPage?: () => void;
  onSelect: (pageId: string) => void;
  selectedPageId: string;
  onEdit?: (pageId: string | undefined) => void;
  editingPageId?: string;
}) => {
  const [pages] = usePages();
  const pagesTree = useMemo(() => pages && toTreeData(pages), [pages]);

  const renderItem = useCallback(
    (props: TreeItemRenderProps<PagesTreeNode>) => {
      if (props.itemData.type === "folder") {
        return null;
      }

      const isEditing = editingPageId === props.itemData.id;

      return (
        <TreeItemBody
          {...props}
          suffix={
            onEdit && (
              <ItemSuffix
                isParentSelected={props.selectedItemId === props.itemData.id}
                itemId={props.itemData.id}
                editingItemId={editingPageId}
                onEdit={onEdit}
              />
            )
          }
          alwaysShowSuffix={isEditing}
          forceFocus={isEditing}
        >
          <TreeItemLabel prefix={<PageIcon />}>
            {props.itemData.data.name}
          </TreeItemLabel>
        </TreeItemBody>
      );
    },
    [editingPageId, onEdit]
  );

  if (pagesTree === undefined) {
    return null;
  }

  return (
    <Box
      css={{
        position: "relative",
        height: "100%",
        // z-index needed for page settings animation
        zIndex: 1,
        flexGrow: 1,
        background: theme.colors.loContrast,
      }}
    >
      <Header
        title="Pages"
        suffix={
          <>
            {onCreateNewPage && (
              <Tooltip content="New page" side="bottom">
                <Button
                  onClick={() => onCreateNewPage()}
                  aria-label="New page"
                  prefix={<NewPageIcon />}
                  color="ghost"
                />
              </Tooltip>
            )}
            {onClose && <CloseButton onClick={onClose} />}
          </>
        }
      />
      <TreeNode
        hideRoot
        selectedItemId={selectedPageId}
        onSelect={onSelect}
        itemData={pagesTree}
        renderItem={renderItem}
        {...staticTreeProps}
      />
    </Box>
  );
};

export const TabContent = (props: TabContentProps) => {
  const [currentPageId] = useCurrentPageId();
  const [project] = useProject();

  const navigate = useNavigate();
  const handleSelect = (pageId: "home" | Page["id"]) => {
    if (project === undefined) {
      return;
    }
    navigate(
      designerPath({
        projectId: project.id,
        pageId: pageId === "home" ? undefined : pageId,
      })
    );
  };

  const newPageId = "new-page";
  const [editingPageId, setEditingPageId] = useState<string>();

  if (currentPageId === undefined || project === undefined) {
    return null;
  }

  return (
    <>
      <PagesPanel
        onClose={() => props.onSetActiveTab("none")}
        onCreateNewPage={() =>
          setEditingPageId((current) =>
            current === newPageId ? undefined : newPageId
          )
        }
        onSelect={handleSelect}
        selectedPageId={currentPageId}
        onEdit={setEditingPageId}
        editingPageId={editingPageId}
      />
      <SettingsPanel isOpen={editingPageId !== undefined}>
        {editingPageId === newPageId && (
          <NewPageSettings
            projectId={project.id}
            onClose={() => setEditingPageId(undefined)}
            onSuccess={(page) => {
              setEditingPageId(undefined);
              handleSelect(page.id);
            }}
          />
        )}
        {editingPageId !== newPageId && editingPageId !== undefined && (
          <PageSettings
            onClose={() => setEditingPageId(undefined)}
            onDelete={() => {
              setEditingPageId(undefined);
              if (editingPageId === currentPageId) {
                handleSelect("home");
              }
            }}
            pageId={editingPageId}
            projectId={project.id}
            key={editingPageId}
          />
        )}
      </SettingsPanel>
    </>
  );
};

export const icon = <PageIcon />;
