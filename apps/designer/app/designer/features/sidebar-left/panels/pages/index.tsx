// @todo: consider moving code from index.tsx to separate files similar to other panels

import { TreeNodeLabel, TreeNode } from "@webstudio-is/design-system";
import { type Publish } from "~/shared/pubsub";
import { StackIcon } from "@webstudio-is/icons";
import type { TabName } from "../../types";
import { Header } from "../../lib/header";
import { usePages } from "~/designer/shared/nano-states";
import { type Page, type Pages } from "@webstudio-is/project";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

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

const TabBody = ({
  pages,
  currentPageId,
}: {
  pages: Pages;
  currentPageId: string;
}) => {
  const pagesTree = useMemo(() => pages && toTreeData(pages), [pages]);

  const navigate = useNavigate();
  const handleSelect = (pageId: string) => {
    navigate(`/todo/${pageId}`);
  };

  return (
    <>
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

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [pagesData] = usePages();
  return (
    <>
      <Header title="Pages" onClose={() => onSetActiveTab("none")} />
      {pagesData && (
        <TabBody
          pages={pagesData.pages}
          currentPageId={pagesData.currentPageId}
        />
      )}
    </>
  );
};

// @todo: proper icon
export const icon = <StackIcon />;

// export type TreeNodeProps<Data extends { id: string }> = {
//   itemData: Data;
//   getItemChildren: (item: Data) => Data[];
//   renderItem: (props: { data: Data; isSelected: boolean }) => React.ReactNode;

//   getIsExpanded: (item: Data) => boolean;
//   setIsExpanded?: (item: Data, expanded: boolean) => void;
//   onExpandTransitionEnd?: () => void;

//   selectedItemId?: string;
//   parentIsSelected?: boolean;
//   onSelect?: (itemId: string) => void;
//   onMouseEnter?: (item: Data) => void;
//   onMouseLeave?: (item: Data) => void;

//   level?: number;
//   animate?: boolean;
//   forceHoverStateAtItem?: string;
// };
