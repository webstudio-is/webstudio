import type { Hook } from "@webstudio-is/react-sdk";
import { hooksCollapsible } from "./collapsible";
import { hooksTabs } from "./tabs";
import { hooksDialog } from "./dialog";
import { hooksPopover } from "./popover";
import { hooksSheet } from "./sheet";
import { hooksTooltip } from "./tooltip";

export const hooks: Hook[] = [
  hooksCollapsible,
  hooksTabs,
  hooksDialog,
  hooksPopover,
  hooksSheet,
  hooksTooltip,
];
