import { nanoid } from "nanoid";
import type { StoreItem } from "./types";

export const items: Array<StoreItem> = [
  {
    id: nanoid(),
    category: "sectionTemplates",
    label: "Basic Sections",
    url: "https://webstudio.is",
    ui: {
      component: "panel",
    },
  },
  {
    id: nanoid(),
    category: "apps",
    label: "My App",
    url: "https://webstudio.is",
    ui: {
      component: "dialog",
      width: 600,
      height: 400,
    },
  },
];
