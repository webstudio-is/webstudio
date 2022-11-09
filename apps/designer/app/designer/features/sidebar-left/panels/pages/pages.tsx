import {
  IconButton,
  TreeItemLabel,
  TreeItemBody,
  TreeNode,
  type TreeItemRenderProps,
  styled,
  Flex,
  Tooltip,
} from "@webstudio-is/design-system";
import { type Publish } from "~/shared/pubsub";
import {
  ChevronRightIcon,
  MenuIcon,
  NewPageIcon,
  PageIcon,
} from "@webstudio-is/icons";
import type { TabName } from "../../types";
import { CloseButton, Header } from "../../lib/header";
import { type Page, type Pages } from "@webstudio-is/project";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCurrentPageId,
  usePages,
  useProject,
} from "~/designer/shared/nano-states";
import { SettingsPanel } from "./settings-panel";
import { NewPageSettings, PageSettings } from "./settings";
import { designerPath } from "~/shared/router-utils";

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

const MenuButton = styled(IconButton, {
  color: "$hint",
  "&:hover, &:focus": { color: "$hiContrast" },
  variants: {
    isParentSelected: {
      true: {
        color: "$loContrast",
        "&:hover, &:focus": { color: "$slate7" },
      },
    },
  },
});

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
  onEdit?: (pageId: string) => void;
  editingPageId?: string;
}) => {
  const [pages] = usePages();
  const pagesTree = useMemo(() => pages && toTreeData(pages), [pages]);

  const renderItem = useCallback(
    (props: TreeItemRenderProps<PagesTreeNode>) => {
      if (props.itemData.type === "folder") {
        return null;
      }

      const isSelected = props.selectedItemId === props.itemData.id;
      const isEditing = editingPageId === props.itemData.id;

      return (
        <TreeItemBody
          {...props}
          suffix={
            onEdit && (
              <Flex css={{ mr: "$spacing$5" }} align="center">
                {isEditing ? (
                  <ChevronRightIcon />
                ) : (
                  <Tooltip
                    content="Open page settings"
                    side="left"
                    disableHoverableContent
                  >
                    <MenuButton
                      aria-label="Open page settings"
                      isParentSelected={isSelected}
                      onClick={() => onEdit(props.itemData.id)}
                    >
                      <MenuIcon />
                    </MenuButton>
                  </Tooltip>
                )}
              </Flex>
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
    <>
      <Header
        title="Pages"
        suffix={
          <>
            {onCreateNewPage && (
              <Tooltip content="New page" side="bottom">
                <IconButton
                  size="2"
                  onClick={() => onCreateNewPage()}
                  aria-label="New page"
                >
                  <NewPageIcon />
                </IconButton>
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
    </>
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
