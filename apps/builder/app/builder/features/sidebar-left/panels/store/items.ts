import { nanoid } from "nanoid";
import type { StoreItem } from "./types";

export const items: Array<StoreItem> = [
  {
    id: nanoid(),
    category: "sectionTemplates",
    label: "Basic Sections",
    url: "https://webstudio.is",
    width: 600,
    height: 400,
  },
];
