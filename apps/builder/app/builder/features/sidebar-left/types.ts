import type { Publish } from "~/shared/pubsub";

export type TabName =
  | "assets"
  | "components"
  | "navigator"
  | "pages"
  | "store"
  | "none";

export type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};
