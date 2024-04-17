import type { Publish } from "~/shared/pubsub";

export type TabName =
  | "assets"
  | "components"
  | "navigator"
  | "pages"
  | "marketplace"
  | "none";

export type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};
