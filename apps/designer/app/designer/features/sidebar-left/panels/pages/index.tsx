// @todo: consider moving code from index.tsx to separate files similar to other panels

import { type Publish } from "~/shared/pubsub";
import { StackIcon } from "@webstudio-is/icons";
import type { TabName } from "../../types";
import { Header } from "../../lib/header";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  return (
    <>
      <Header title="Pages" onClose={() => onSetActiveTab("none")} />
    </>
  );
};

// @todo: proper icon
export const icon = <StackIcon />;
