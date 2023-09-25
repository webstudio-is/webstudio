import type { Breakpoint, Instance } from "@webstudio-is/sdk";
import { createPubsub } from "./create";
import type { Change } from "immerhin";
import type {
  ItemDropTarget,
  Placement,
  Point,
} from "@webstudio-is/design-system";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";

export type SyncEventSource = "canvas" | "builder";

export type InstanceSelector = Instance["id"][];

type StoreData = {
  namespace: string;
  value: unknown;
};

export type Origin = "canvas" | "panel";

export type DragStartPayload =
  | { origin: Origin; type: "insert"; dragComponent: Instance["component"] }
  | {
      origin: Origin;
      type: "reparent";
      dragInstanceSelector: InstanceSelector;
    };

export type DragEndPayload = {
  isCanceled: boolean;
};

export type DragMovePayload = { canvasCoordinates: Point };

export type StyleUpdate =
  | {
      operation: "delete";
      property: StyleProperty;
    }
  | {
      operation: "set";
      property: StyleProperty;
      value: StyleValue;
    };

export type StyleUpdates = {
  id: Instance["id"];
  updates: Array<StyleUpdate>;
  breakpoint: Breakpoint;
  state: undefined | string;
};

export type Format =
  | "bold"
  | "italic"
  | "superscript"
  | "subscript"
  | "link"
  | "span"
  | "clear";

// this interface is meant to be augmented by the user
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type PubsubMap = {
  handshake: { source: SyncEventSource };

  sendStoreData: {
    // distinct source to avoid infinite loop
    source: SyncEventSource;
    data: StoreData[];
  };
  sendStoreChanges: {
    // distinct source to avoid infinite loop
    source: SyncEventSource;
    changes: Change[];
  };

  dragEnd: DragEndPayload;
  dragMove: DragMovePayload;
  dragStart: DragStartPayload;
  dropTargetChange: undefined | ItemDropTarget;
  placementIndicatorChange: undefined | Placement;

  cancelCurrentDrag: undefined;
  openBreakpointsMenu: undefined;

  shortcut: { name: "preview" | "breakpointsMenu" | "esc" | "enter" };

  updateStyle: StyleUpdates;
  previewStyle: StyleUpdates;

  previewMode: boolean;
  formatTextToolbar: Format;

  clickCanvas: undefined;
};

export const { publish, usePublish, useSubscribe, subscribe } =
  createPubsub<PubsubMap>();
export type Publish = typeof publish;
export type UsePublish = typeof usePublish;
