import { atom } from "nanostores";
import type { ContentBlockDiagnostic } from "@webstudio-is/sdk";
import type {
  DroppableTarget,
  InstanceSelector,
  MaterializedContentRoot,
} from "@webstudio-is/project-build/runtime";
import { createPubsub } from "./create";

// Allow commands to declare their types
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CommandRegistry {}

// Generate namespaced command types from CommandRegistry
type NamespacedCommands = {
  [K in keyof CommandRegistry as `command:${K & string}`]: CommandRegistry[K];
};

export interface PubsubMap extends NamespacedCommands {
  command: {
    source: string;
    name: string;
    [key: string]: unknown;
  };
  contentBlockSourceStatus: {
    projectId: string;
    blockInstanceId: string;
    renderScope: string;
    status: "loading" | "ready";
  };
  contentBlockSourceReload: {
    projectId: string;
    blockInstanceId: string;
    renderScope: string;
    root?: MaterializedContentRoot;
    diagnostics: readonly ContentBlockDiagnostic[];
    editingInstanceSelector?: InstanceSelector;
  };
  contentBlockMaterialized: {
    projectId: string;
    root: MaterializedContentRoot;
    diagnostics: readonly ContentBlockDiagnostic[];
  };
  contentBlockMaterializedRemoved: {
    projectId: string;
    blockInstanceId: string;
    renderScope: string;
  };
  contentBlockReparentRequest: {
    requestId: string;
    sourceInstanceSelector: InstanceSelector;
    dropTarget: DroppableTarget;
  };
  contentBlockReparentResult: {
    requestId: string;
    success: boolean;
  };
}

export const { publish, usePublish, useSubscribe, subscribe } =
  createPubsub<PubsubMap>();
export type Publish = typeof publish;
export type UsePublish = typeof usePublish;

export const $publisher = atom<{ publish?: Publish }>({});
