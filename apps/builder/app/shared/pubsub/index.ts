import { atom } from "nanostores";
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
}

export const { publish, usePublish, useSubscribe, subscribe } =
  createPubsub<PubsubMap>();
export type Publish = typeof publish;
export type UsePublish = typeof usePublish;

export const $publisher = atom<{ publish?: Publish }>({});
