import { TreeNodeLabel, TreeNode } from "@webstudio-is/design-system";
import { type Publish } from "~/shared/pubsub";
import { PageIcon } from "@webstudio-is/icons";
import type { TabName } from "../../types";
import { Header } from "../../lib/header";
import { type Page, type Pages, type Project } from "@webstudio-is/project";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { type Config } from "~/config";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
  project: Project;
  pages: Pages;
  currentPageId: string;
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
  renderItem(props: { data: PagesTreeNode; isSelected: boolean }) {
    if (props.data.type === "folder") {
      return null;
    }

    return (
      <TreeNodeLabel
        isSelected={props.isSelected}
        text={props.data.data.name}
      />
    );
  },
};

export const TabContent = ({
  onSetActiveTab,
  project,
  pages,
  currentPageId,
  config,
}: TabContentProps) => {
  const pagesTree = useMemo(() => pages && toTreeData(pages), [pages]);

  const navigate = useNavigate();
  const handleSelect = (pageId: string) => {
    navigate(`${config.designerPath}/${project.id}?pageId=${pageId}`);
  };

  return (
    <>
      <Header title="Pages" onClose={() => onSetActiveTab("none")} />
      <TreeNode
        hideRoot
        selectedItemId={currentPageId}
        onSelect={handleSelect}
        itemData={pagesTree}
        {...staticTreeProps}
      />
    </>
  );
};

export const icon = <PageIcon />;
