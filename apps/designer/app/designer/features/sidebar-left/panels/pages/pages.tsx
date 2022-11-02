import {
  IconButton,
  TreeItemLabel,
  TreeItemBody,
  TreeNode,
  type TreeItemRenderProps,
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
import { type Config } from "~/config";
import {
  useCurrentPageId,
  usePages,
  useProject,
} from "~/designer/shared/nano-states";
import { SettingsPanel } from "./settings-panel";
import { NewPageSettings, PageSettings } from "./settings";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
  config: Config;
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

const PagesPanel = ({
  onClose,
  onNewPage,
  onSelect,
  selectedPageId,
  onEdit,
  editingPageId,
}: {
  onClose?: () => void;
  onNewPage?: () => void;
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
            onEdit &&
            (isEditing ? (
              <ChevronRightIcon />
            ) : (
              <IconButton
                variant={isSelected ? "selectedItemAction" : "itemAction"}
                onClick={() => onEdit(props.itemData.id)}
              >
                <MenuIcon />
              </IconButton>
            ))
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
            {onNewPage && (
              <IconButton
                size="2"
                onClick={() => onNewPage()}
                aria-label="New Page"
              >
                <NewPageIcon />
              </IconButton>
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
    if (pageId === "home") {
      navigate(`${props.config.designerPath}/${project.id}`);
    } else {
      navigate(`${props.config.designerPath}/${project.id}?pageId=${pageId}`);
    }
  };

  const NEW_PAGE = "new-page";
  const [editingPageId, setEditingPageId] = useState<string>();

  if (currentPageId === undefined || project === undefined) {
    return null;
  }

  return (
    <>
      <PagesPanel
        onClose={() => props.onSetActiveTab("none")}
        onNewPage={() =>
          setEditingPageId((current) =>
            current === NEW_PAGE ? undefined : NEW_PAGE
          )
        }
        onSelect={handleSelect}
        selectedPageId={currentPageId}
        onEdit={setEditingPageId}
        editingPageId={editingPageId}
      />
      <SettingsPanel isOpen={editingPageId !== undefined}>
        {editingPageId === NEW_PAGE && (
          <NewPageSettings
            projectId={project.id}
            onClose={() => setEditingPageId(undefined)}
            onSuccess={(page) => {
              setEditingPageId(undefined);
              handleSelect(page.id);
            }}
          />
        )}
        {editingPageId !== NEW_PAGE && editingPageId !== undefined && (
          <PageSettings
            onClose={() => setEditingPageId(undefined)}
            onDeleted={() => {
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
