import { TreeNodeLabel, TreeNode } from "@webstudio-is/design-system";
import { type Publish } from "~/shared/pubsub";
import { PageIcon } from "@webstudio-is/icons";
import type { TabName } from "../../types";
import { Header } from "../../lib/header";
import { type Page, type Pages, type Project } from "@webstudio-is/project";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { type Config } from "~/config";
import {
  useCurrentPageId,
  usePages,
  useProject,
} from "~/designer/shared/nano-states";

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

export const TabContentWithData = ({
  onSetActiveTab,
  config,
  pages,
  currentPageId,
  project,
}: TabContentProps & {
  pages: Pages;
  currentPageId: string;
  project: Project;
}) => {
  const pagesTree = useMemo(() => toTreeData(pages), [pages]);

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

export const TabContent = (props: TabContentProps) => {
  const [pages] = usePages();
  const [currentPageId] = useCurrentPageId();
  const [project] = useProject();

  if (
    pages === undefined ||
    currentPageId === undefined ||
    project === undefined
  ) {
    return null;
  }

  return (
    <TabContentWithData
      {...props}
      pages={pages}
      currentPageId={currentPageId}
      project={project}
    />
  );
};

export const icon = <PageIcon />;
