import type { XYCoord } from "react-dnd";
import { type Instance } from "@webstudio-is/sdk";

export type InitialDragData = {
  currentOffset: XYCoord;
  component: Instance["component"];
};

export type DragData = InitialDragData & {
  id: Instance["id"];
  position: number | "end";
};
