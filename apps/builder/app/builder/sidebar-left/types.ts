export const sidebarPanelNames = [
  "assets",
  "components",
  "navigator",
  "pages",
  "marketplace",
] as const;

export type SidebarPanelName = (typeof sidebarPanelNames)[number] | "none";
