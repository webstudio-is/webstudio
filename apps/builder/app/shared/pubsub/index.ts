import { createPubsub } from "./create";

// this interface is meant to be augmented by the user
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PubsubMap {}

export const { publish, usePublish, useSubscribe, subscribe } =
  createPubsub<PubsubMap>();
export type Publish = typeof publish;
export type UsePublish = typeof usePublish;
