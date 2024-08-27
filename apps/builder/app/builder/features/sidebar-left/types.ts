import type { SidebarPanelName } from "~/builder/shared/nano-states";
import type { Publish } from "~/shared/pubsub";

export type TabContentProps = {
  onSetActiveTab: (tabName: SidebarPanelName) => void;
  publish: Publish;
};
