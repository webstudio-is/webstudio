import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  DeprecatedIconButton,
  TreeItemLabel,
  TreeItemBody,
  TreeNode,
  type TreeItemRenderProps,
  type ItemSelector,
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
  PageIcon,
  PlusIcon,
} from "@webstudio-is/icons";
import type { Page, Pages } from "@webstudio-is/sdk";
import type { TabName } from "../../types";
import { CloseButton, Header } from "../../header";
import { SettingsPanel } from "./settings-panel";
import { NewPageSettings, PageSettings } from "./settings";
import { pagesStore, selectedPageIdStore } from "~/shared/nano-states";
import { switchPage } from "~/shared/pages";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
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
  const pages = useStore(pagesStore);
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
                isParentSelected={props.isSelected ?? false}
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

  const selectTreeNode = useCallback(
    ([pageId]: ItemSelector) => onSelect(pageId),
    [onSelect]
  );

  if (pagesTree === undefined) {
    return null;
  }

  return (
    <Flex
      css={{
        position: "relative",
        height: "100%",
        // z-index needed for page settings animation
        zIndex: 1,
        flexGrow: 1,
        background: theme.colors.backgroundPanel,
      }}
      direction="column"
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
                  prefix={<PlusIcon />}
                  color="ghost"
                />
              </Tooltip>
            )}
            {onClose && <CloseButton onClick={onClose} />}
          </>
        }
      />
      <Box css={{ overflowY: "auto", flexBasis: 0, flexGrow: 1 }}>
        <TreeNode<PagesTreeNode>
          selectedItemSelector={[selectedPageId, pagesTree.id]}
          onSelect={selectTreeNode}
          itemData={pagesTree}
          renderItem={renderItem}
          getItemChildren={(nodeId) => {
            if (nodeId === pagesTree.id && pagesTree.type === "folder") {
              return pagesTree.children;
            }
            return [];
          }}
          isItemHidden={(itemId) => itemId === pagesTree.id}
          getIsExpanded={() => true}
        />
      </Box>
    </Flex>
  );
};

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const currentPageId = useStore(selectedPageIdStore);
  const newPageId = "new-page";
  const [editingPageId, setEditingPageId] = useState<string>();

  if (currentPageId === undefined) {
    return null;
  }

  return (
    <>
      <PagesPanel
        onClose={() => onSetActiveTab("none")}
        onCreateNewPage={() =>
          setEditingPageId((current) =>
            current === newPageId ? undefined : newPageId
          )
        }
        onSelect={(pageId) => {
          switchPage(pageId);
          onSetActiveTab("none");
        }}
        selectedPageId={currentPageId}
        onEdit={setEditingPageId}
        editingPageId={editingPageId}
      />
      <SettingsPanel isOpen={editingPageId !== undefined}>
        {editingPageId === newPageId && (
          <NewPageSettings
            onClose={() => setEditingPageId(undefined)}
            onSuccess={(pageId) => {
              setEditingPageId(undefined);
              switchPage(pageId);
            }}
          />
        )}
        {editingPageId !== newPageId && editingPageId !== undefined && (
          <PageSettings
            onClose={() => setEditingPageId(undefined)}
            onDelete={() => {
              setEditingPageId(undefined);
              if (editingPageId === currentPageId) {
                switchPage();
              }
            }}
            pageId={editingPageId}
            key={editingPageId}
          />
        )}
      </SettingsPanel>
    </>
  );
};

export const icon = <PageIcon />;
