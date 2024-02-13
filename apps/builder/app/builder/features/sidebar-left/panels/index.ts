import * as components from "./components";
import * as navigator from "./navigator";
import * as assets from "./assets";
import * as pages from "./pages";
import type { TabContentProps, TabName } from "../types";
import type { ReactNode } from "react";

type PanelExports = {
  TabContent: (props: TabContentProps) => ReactNode;
  icon: ReactNode;
};

export const panels = new Map<TabName, PanelExports>([
  ["components", components],
  ["pages", pages],
  ["navigator", navigator],
  ["assets", assets],
]);
