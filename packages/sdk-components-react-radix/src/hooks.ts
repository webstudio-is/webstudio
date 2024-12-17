import type { Hook } from "@webstudio-is/react-sdk";
import { hooksCollapsible } from "./collapsible";
import { hooksTabs } from "./tabs";
import { hooksDialog } from "./dialog";
import { hooksPopover } from "./popover";
import { hooksTooltip } from "./tooltip";
import { hooksAccordion } from "./accordion";
import { hooksNavigationMenu } from "./navigation-menu";
import { hooksSelect } from "./select";

export const hooks: Hook[] = [
  hooksCollapsible,
  hooksTabs,
  hooksDialog,
  hooksPopover,
  hooksTooltip,
  hooksAccordion,
  hooksNavigationMenu,
  hooksSelect,
];
