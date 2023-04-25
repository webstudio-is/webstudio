import type { Template } from "..";
import {
  templateEdit as templateEditInstances,
  templateGenerate as templateGenerateInstances,
} from "./instances";
import {
  templateEdit as templateEditStyles,
  templateGenerate as templateGenerateStyles,
} from "./styles";
// import { template as styles } from "./tw-styles";

export const templateJsx: Record<
  "generate" | "edit",
  Record<"instances" | "styles", Template>
> = {
  generate: {
    instances: templateGenerateInstances,
    styles: templateGenerateStyles,
  },
  edit: {
    instances: templateEditInstances,
    styles: templateEditStyles,
  },
};

// export type TemplateJsxStep = keyof typeof templateJsx;
