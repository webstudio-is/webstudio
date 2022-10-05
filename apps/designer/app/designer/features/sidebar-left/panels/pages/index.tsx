// @todo: consider moving code from index.tsx to separate files similar to other panels

import { type Publish } from "~/shared/pubsub";
import { StackIcon } from "@webstudio-is/icons";
import type { TabName } from "../../types";
import { Header } from "../../lib/header";
import { usePages } from "~/designer/shared/nano-states";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [pages] = usePages();

  return (
    <>
      <Header title="Pages" onClose={() => onSetActiveTab("none")} />
      <div>{JSON.stringify(pages)}</div>
    </>
  );
};

// @todo: proper icon
export const icon = <StackIcon />;
