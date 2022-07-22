import { type Instance } from "@webstudio-is/react-sdk";

interface XYCoord {
  x: number;
  y: number;
}

export type DragData = {
  instance: Instance;
  currentOffset: XYCoord;
};

export type DropData = {
  instance: Instance;
  position: number | "end";
};
