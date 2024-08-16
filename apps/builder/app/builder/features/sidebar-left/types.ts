import type { Publish } from "~/shared/pubsub";

export type SidebarPanelName =
  | "assets"
  | "components"
  | "navigator"
  | "pages"
  | "marketplace"
  | "none";

export type TabContentProps = {
  onSetActiveTab: (tabName: SidebarPanelName) => void;
  publish: Publish;
};
