/** Component templates consumed by story generation. */
import { meta as label } from "./label.template";
import { meta as tabs } from "./tabs.template";
import { meta as sheet } from "./sheet.template";
import { meta as dialog } from "./dialog.template";
import { meta as switchTemplate } from "./switch.template";
import { meta as checkbox } from "./checkbox.template";
import { meta as collapsible } from "./collapsible.template";
import { meta as accordion } from "./accordion.template";
import { meta as tooltip } from "./tooltip.template";
import { meta as popover } from "./popover.template";
import { meta as radioGroup } from "./radio-group.template";
import { meta as select } from "./select.template";
import { meta as navigationMenu } from "./navigation-menu.template";

export const templates = [
  { meta: label },
  { meta: tabs },
  { storyName: "Sheet", meta: sheet },
  { meta: dialog },
  { meta: switchTemplate },
  { storyName: "Checkbox", meta: checkbox },
  { meta: collapsible },
  { meta: accordion },
  { meta: tooltip },
  { meta: popover },
  { meta: radioGroup },
  { meta: select },
  { meta: navigationMenu },
];
